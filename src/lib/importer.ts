import type { CsOperation, SrElement } from "@/lib/types";

/** ARXML 임포트 페이로드 (클이언트 DOMParser로 파싱 → 서버 액션으로 전달) */
export interface ImportPayload {
  name: string;
  arPackageRoot: string;
  dataTypes: {
    name: string;
    category: string;
    baseType: string;
    lowerLimit: string;
    upperLimit: string;
    unit: string;
    elementType: string;
    maxSize: number;
    elements: { name: string; typeRef: string }[];
  }[];
  interfaces: {
    name: string;
    kind: string;
    elements: (SrElement | CsOperation)[];
  }[];
  components: {
    name: string;
    category: string;
    description: string;
    ports: {
      name: string;
      direction: "provided" | "required";
      interfaceName: string | null;
      queued: boolean;
    }[];
    runnables: {
      name: string;
      eventType: string;
      periodMs: number;
      operationPort: string;
    }[];
  }[];
  connections: {
    providerSwc: string;
    providerPort: string;
    requesterSwc: string;
    requesterPort: string;
  }[];
}

const basename = (path: string) => {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
};

const SWC_TAGS: [string, string][] = [
  ["APPLICATION-SOFTWARE-COMPONENT-TYPE", "application"],
  ["SENSOR-ACTUATOR-SW-COMPONENT-TYPE", "sensoractuator"],
  ["SERVICE-SW-COMPONENT-TYPE", "service"],
  ["NV-BLOCK-SW-COMPONENT-TYPE", "nvblock"],
  ["PARAMETER-SW-COMPONENT-TYPE", "parameter"],
  ["ECU-ABSTRACTION-SW-COMPONENT-TYPE", "ecu-abstraction"],
  ["COMPLEX-DEVICE-DRIVER-SW-COMPONENT-TYPE", "complex-device-driver"],
  ["COMPOSITION-SW-COMPONENT-TYPE", "composition"],
];

function kids(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter((c) => c.tagName === tag);
}

function childText(el: Element, tag: string): string {
  return kids(el, tag)[0]?.textContent?.trim() ?? "";
}

function all(el: Document | Element, tag: string): Element[] {
  return Array.from(el.getElementsByTagName(tag));
}

/** ARXML 문자열 → ImportPayload (DOMParser, 브라우저 전용) */
export function parseArxml(xmlText: string): ImportPayload {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("올바른 XML 문서가 아닙니다.");
  }
  if (!doc.documentElement || doc.documentElement.tagName !== "AUTOSAR") {
    throw new Error("AUTOSAR 루트 요소를 찾을 수 없습니다.");
  }

  // 루트 AR-PACKAGE
  const firstPkg = all(doc, "AR-PACKAGE")[0];
  const arPackageRoot = firstPkg ? childText(firstPkg, "SHORT-NAME") : "Imported";

  // ── Data Types ─────────────────────────────────────────
  // IMPLEMENTATION-DATA-TYPE: SHORT-NAME → BASE-TYPE-REF 직접 매핑.
  // (SUB-ELEMENTS 안 요소의 BASE-TYPE-REF는 베이스 판정에 사용하지 않음)
  const implByName = new Map<string, string>();
  for (const impl of all(doc, "IMPLEMENTATION-DATA-TYPE")) {
    const name = childText(impl, "SHORT-NAME");
    const bref = childText(impl, "BASE-TYPE-REF");
    if (name && bref) implByName.set(name, basename(bref));
  }
  const constrByName = new Map<string, { lo: string; up: string }>();
  for (const c of all(doc, "DATA-CONSTR")) {
    const name = childText(c, "SHORT-NAME");
    constrByName.set(name.replace(/_Constr$/, ""), {
      lo: childText(c, "LOWER-LIMIT") || "0",
      up: childText(c, "UPPER-LIMIT") || "65535",
    });
  }
  const dataTypes: ImportPayload["dataTypes"] = [];
  for (const dt of all(doc, "APPLICATION-PRIMITIVE-DATA-TYPE")) {
    const name = childText(dt, "SHORT-NAME");
    if (!name) continue;
    const categoryRaw = childText(dt, "CATEGORY") || "VALUE";
    const unit = basename(childText(dt, "UNIT-REF"));
    dataTypes.push({
      name,
      category: categoryRaw === "BOOLEAN" ? "BOOLEAN" : "VALUE",
      baseType:
        implByName.get(name) ??
        implByName.get(`${name}_Impl`) ??
        "uint16",
      lowerLimit: constrByName.get(name)?.lo ?? "0",
      upperLimit: constrByName.get(name)?.up ?? "65535",
      unit: unit.includes("/") ? "" : unit.length > 0 && unit !== name ? unit : "",
      elementType: "",
      maxSize: 0,
      elements: [],
    });
  }
  for (const dt of all(doc, "APPLICATION-ARRAY-DATA-TYPE")) {
    const name = childText(dt, "SHORT-NAME");
    if (!name) continue;
    const el = all(dt, "ELEMENT")[0] ?? dt;
    const elemType = basename(childText(el, "TYPE-TREF"));
    const maxRaw = childText(el, "MAX-NUMBER-OF-ELEMENTS");
    dataTypes.push({
      name,
      category: "ARRAY",
      baseType: implByName.get(elemType) ?? "uint16",
      lowerLimit: "0",
      upperLimit: "0",
      unit: "",
      elementType: elemType,
      maxSize: parseInt(maxRaw, 10) || 0,
      elements: [],
    });
  }
  for (const dt of all(doc, "APPLICATION-RECORD-DATA-TYPE")) {
    const name = childText(dt, "SHORT-NAME");
    if (!name) continue;
    const members: { name: string; typeRef: string }[] = [];
    for (const el of all(dt, "APPLICATION-RECORD-ELEMENT")) {
      members.push({
        name: childText(el, "SHORT-NAME"),
        typeRef: basename(childText(el, "TYPE-TREF")),
      });
    }
    dataTypes.push({
      name,
      category: "STRUCTURE",
      baseType: "",
      lowerLimit: "0",
      upperLimit: "0",
      unit: "",
      elementType: "",
      maxSize: 0,
      elements: members,
    });
  }

  // ── Interfaces ─────────────────────────────────────────
  const interfaces: ImportPayload["interfaces"] = [];
  for (const iface of all(doc, "SENDER-RECEIVER-INTERFACE")) {
    const name = childText(iface, "SHORT-NAME");
    if (!name) continue;
    const els: SrElement[] = [];
    for (const el of all(iface, "VARIABLE-DATA-PROTOTYPE")) {
      els.push({
        name: childText(el, "SHORT-NAME"),
        typeRef: basename(childText(el, "TYPE-TREF")),
      });
    }
    interfaces.push({ name, kind: "sender-receiver", elements: els });
  }
  for (const iface of all(doc, "CLIENT-SERVER-INTERFACE")) {
    const name = childText(iface, "SHORT-NAME");
    if (!name) continue;
    const ops: CsOperation[] = [];
    for (const op of all(iface, "CLIENT-SERVER-OPERATION")) {
      const args: CsOperation["args"] = [];
      for (const a of all(op, "ARGUMENT-DATA-PROTOTYPE")) {
        const dir = childText(a, "DIRECTION");
        args.push({
          name: childText(a, "SHORT-NAME"),
          direction: dir === "OUT" || dir === "INOUT" ? dir : "IN",
          typeRef: basename(childText(a, "TYPE-TREF")),
        });
      }
      ops.push({ name: childText(op, "SHORT-NAME"), args });
    }
    interfaces.push({ name, kind: "client-server", elements: ops });
  }

  // ── SW Components ──────────────────────────────────────
  const components: ImportPayload["components"] = [];
  for (const [tag, category] of SWC_TAGS) {
    for (const swc of all(doc, tag)) {
      const name = childText(swc, "SHORT-NAME");
      if (!name) continue;
      // 이 도구가 생성한 최상위 컴포지션은 라운드트립 노이즈 방지를 위해 제외
      if (name === "RootComposition") continue;

      const ports: ImportPayload["components"][number]["ports"] = [];
      for (const p of kids(kids(swc, "PORTS")[0] ?? swc, "P-PORT-PROTOTYPE")) {
        ports.push({
          name: childText(p, "SHORT-NAME"),
          direction: "provided",
          interfaceName:
            basename(childText(p, "PROVIDED-INTERFACE-TREF")) || null,
          queued: false,
        });
      }
      for (const p of kids(kids(swc, "PORTS")[0] ?? swc, "R-PORT-PROTOTYPE")) {
        ports.push({
          name: childText(p, "SHORT-NAME"),
          direction: "required",
          interfaceName:
            basename(childText(p, "REQUIRED-INTERFACE-TREF")) || null,
          queued: p.getElementsByTagName("QUEUED-RECEIVER-COM-SPEC").length > 0,
        });
      }

      const runnables: ImportPayload["components"][number]["runnables"] = [];
      const byName = new Map<string, { eventType: string; periodMs: number; operationPort: string }>();
      for (const ev of all(swc, "TIMING-EVENT")) {
        const rn = basename(childText(ev, "START-ON-EVENT-REF"));
        const sec = parseFloat(childText(ev, "PERIOD") || "0");
        byName.set(rn, {
          eventType: "timing",
          periodMs: Math.max(1, Math.round(sec * 1000)),
          operationPort: "",
        });
      }
      for (const ev of all(swc, "INIT-EVENT")) {
        const rn = basename(childText(ev, "START-ON-EVENT-REF"));
        byName.set(rn, { eventType: "init", periodMs: 0, operationPort: "" });
      }
      for (const ev of all(swc, "OPERATION-INVOKED-EVENT")) {
        const rn = basename(childText(ev, "START-ON-EVENT-REF"));
        byName.set(rn, {
          eventType: "operation-invoked",
          periodMs: 0,
          operationPort:
            basename(
              childText(kids(ev, "OPERATION-IREF")[0] ?? ev, "CONTEXT-P-PORT-REF"),
            ) || "",
        });
      }
      for (const r of all(swc, "RUNNABLE-ENTITY")) {
        const rn = childText(r, "SHORT-NAME");
        if (!rn) continue;
        const meta = byName.get(rn);
        runnables.push({
          name: rn,
          eventType: meta?.eventType ?? "timing",
          periodMs: meta?.periodMs ?? 10,
          operationPort: meta?.operationPort ?? "",
        });
      }

      components.push({
        name,
        category,
        description: "",
        ports,
        runnables,
      });
    }
  }

  // ── Composition → Assembly Connectors ──────────────────
  const connections: ImportPayload["connections"] = [];
  for (const conn of all(doc, "ASSEMBLY-SW-CONNECTOR")) {
    const provider = childText(conn, "TARGET-P-PORT-REF");
    const requester = childText(conn, "TARGET-R-PORT-REF");
    if (!provider || !requester) continue;
    const pp = provider.split("/").filter(Boolean);
    const rp = requester.split("/").filter(Boolean);
    if (pp.length < 2 || rp.length < 2) continue;
    connections.push({
      providerSwc: pp[pp.length - 2],
      providerPort: pp[pp.length - 1],
      requesterSwc: rp[rp.length - 2],
      requesterPort: rp[rp.length - 1],
    });
  }

  return {
    name: arPackageRoot,
    arPackageRoot,
    dataTypes,
    interfaces,
    components,
    connections,
  };
}
