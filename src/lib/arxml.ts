import type {
  DataTypeRow,
  InterfaceRow,
  PortRow,
  RunnableRow,
  SwcRow,
} from "@/db/schema";
import {
  csOperations,
  SWC_CATEGORIES,
  srElements,
  type FullProject,
} from "@/lib/types";

/** XML 특수문자 이스케이프 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * OPERATION-INVOKED-EVENT가 참조할 P-Port와 그 인터페이스의
 * 첫 번째 CLIENT-SERVER-OPERATION을 실제 데이터에서 찾아 반환.
 * operationPort가 비어 있거나, 해당 이름의 P-Port가 없거나,
 * 그 포트가 C/S 인터페이스에 연결되어 있지 않거나, 오퍼레이션이
 * 하나도 없으면 null을 반환한다(추측으로 참조를 만들지 않음).
 */
function resolveOperationTarget(
  swc: FullSwc,
  ifaces: InterfaceRow[],
  operationPort: string,
): { port: PortRow; iface: InterfaceRow; opName: string } | null {
  if (!operationPort) return null;
  const port = swc.ports.find(
    (p) => p.name === operationPort && p.direction === "provided",
  );
  if (!port || !port.interfaceId) return null;
  const iface = ifaces.find((i) => i.id === port.interfaceId);
  if (!iface || iface.kind !== "client-server") return null;
  const ops = csOperations(iface);
  if (ops.length === 0) return null;
  // 여러 오퍼레이션이 있으면 첫 번째를 사용(러너블-오퍼레이션 1:1 매핑 정보가
  // 스키마에 없으므로, 필요 시 runnable 이름과 일치하는 오퍼레이션을 우선한다).
  const match =
    ops.find((o) => o.name.toLowerCase() === operationPort.toLowerCase()) ??
    ops[0];
  return { port, iface, opName: match.name };
}

const VERSION_SCHEMA: Record<string, { ns: string; xsd: string }> = {
  "R20-11": { ns: "http://autosar.org/schema/r4.0", xsd: "AUTOSAR_00049.xsd" },
  "R21-11": { ns: "http://autosar.org/schema/r4.0", xsd: "AUTOSAR_00050.xsd" },
  "R22-11": { ns: "http://autosar.org/schema/r4.0", xsd: "AUTOSAR_00051.xsd" },
  "R23-11": { ns: "http://autosar.org/schema/r4.0", xsd: "AUTOSAR_00052.xsd" },
  "R24-11": { ns: "http://autosar.org/schema/r4.0", xsd: "AUTOSAR_00053.xsd" },
};

/** 들여쓰기 XML 빌더 */
class X {
  private lines: string[] = [];
  private depth = 0;
  open(tag: string, attrs = ""): void {
    this.lines.push(
      `${"  ".repeat(this.depth)}<${tag}${attrs ? " " + attrs : ""}>`,
    );
    this.depth++;
  }
  close(tag: string): void {
    this.depth--;
    this.lines.push(`${"  ".repeat(this.depth)}</${tag}>`);
  }
  leaf(tag: string, value: string, attrs = ""): void {
    this.lines.push(
      `${"  ".repeat(this.depth)}<${tag}${attrs ? " " + attrs : ""}>${esc(value)}</${tag}>`,
    );
  }
  text(s: string): void {
    this.lines.push(`${"  ".repeat(this.depth)}${s}`);
  }
  toString(): string {
    return this.lines.join("\n");
  }
}

type FullSwc = SwcRow & { ports: PortRow[]; runnables: RunnableRow[] };

function emitDataType(x: X, dt: DataTypeRow, root: string, allDts: DataTypeRow[]) {
  // ── ARRAY: APPLICATION-ARRAY-DATA-TYPE + IMPLEMENTATION-DATA-TYPE(SUB-ELEMENTS)
  if (dt.category === "ARRAY") {
    const elementType = String((dt as any).elementType ?? "");
    const maxSize = String((dt as any).maxSize ?? "");
    // element의 base type은 allDts에서 elementType 이름과 일치하는 행의 baseType으로 조회
    const elementBaseType =
      allDts.find((d) => d.name === elementType)?.baseType ?? "uint16";

    x.open("APPLICATION-ARRAY-DATA-TYPE");
    x.leaf("SHORT-NAME", dt.name);
    x.leaf("CATEGORY", "ARRAY");
    x.open("ELEMENT");
    x.leaf("SHORT-NAME", "Element");
    x.leaf(
      "TYPE-TREF",
      `${root}/DataTypes/${elementType}`,
      'DEST="APPLICATION-PRIMITIVE-DATA-TYPE"',
    );
    x.leaf("MAX-NUMBER-OF-ELEMENTS", maxSize);
    x.close("ELEMENT");
    x.close("APPLICATION-ARRAY-DATA-TYPE");

    x.open("IMPLEMENTATION-DATA-TYPE");
    x.leaf("SHORT-NAME", `${dt.name}_Impl`);
    x.leaf("CATEGORY", "ARRAY");
    x.open("SUB-ELEMENTS");
    x.open("IMPLEMENTATION-DATA-TYPE-ELEMENT");
    x.leaf("SHORT-NAME", "Element");
    x.leaf("CATEGORY", "VALUE");
    x.leaf("ARRAY-SIZE", maxSize);
    x.open("SW-DATA-DEF-PROPS");
    x.open("SW-DATA-DEF-PROPS-VARIANTS");
    x.open("SW-DATA-DEF-PROPS-CONDITIONAL");
    x.leaf(
      "BASE-TYPE-REF",
      `${root}/BaseTypes/${elementBaseType}`,
      'DEST="SW-BASE-TYPE"',
    );
    x.close("SW-DATA-DEF-PROPS-CONDITIONAL");
    x.close("SW-DATA-DEF-PROPS-VARIANTS");
    x.close("SW-DATA-DEF-PROPS");
    x.close("IMPLEMENTATION-DATA-TYPE-ELEMENT");
    x.close("SUB-ELEMENTS");
    x.close("IMPLEMENTATION-DATA-TYPE");
    return;
  }

  // ── STRUCTURE: APPLICATION-RECORD-DATA-TYPE + IMPLEMENTATION-DATA-TYPE(SUB-ELEMENTS)
  if (dt.category === "STRUCTURE") {
    const members = ((dt as any).elements ?? []) as {
      name: string;
      typeRef: string;
    }[];

    x.open("APPLICATION-RECORD-DATA-TYPE");
    x.leaf("SHORT-NAME", dt.name);
    x.leaf("CATEGORY", "STRUCTURE");
    x.open("ELEMENTS");
    for (const m of members) {
      x.open("APPLICATION-RECORD-ELEMENT");
      x.leaf("SHORT-NAME", m.name);
      x.leaf(
        "TYPE-TREF",
        `${root}/DataTypes/${m.typeRef}`,
        'DEST="APPLICATION-PRIMITIVE-DATA-TYPE"',
      );
      x.close("APPLICATION-RECORD-ELEMENT");
    }
    x.close("ELEMENTS");
    x.close("APPLICATION-RECORD-DATA-TYPE");

    x.open("IMPLEMENTATION-DATA-TYPE");
    x.leaf("SHORT-NAME", `${dt.name}_Impl`);
    x.leaf("CATEGORY", "STRUCTURE");
    x.open("SUB-ELEMENTS");
    for (const m of members) {
      // 멤버 base type: allDts에서 member.typeRef 이름과 일치하는 행의 baseType
      const memberBaseType =
        allDts.find((d) => d.name === m.typeRef)?.baseType ?? "uint16";
      x.open("IMPLEMENTATION-DATA-TYPE-ELEMENT");
      x.leaf("SHORT-NAME", m.name);
      x.leaf("CATEGORY", "VALUE");
      x.open("SW-DATA-DEF-PROPS");
      x.open("SW-DATA-DEF-PROPS-VARIANTS");
      x.open("SW-DATA-DEF-PROPS-CONDITIONAL");
      x.leaf(
        "BASE-TYPE-REF",
        `${root}/BaseTypes/${memberBaseType}`,
        'DEST="SW-BASE-TYPE"',
      );
      x.close("SW-DATA-DEF-PROPS-CONDITIONAL");
      x.close("SW-DATA-DEF-PROPS-VARIANTS");
      x.close("SW-DATA-DEF-PROPS");
      x.close("IMPLEMENTATION-DATA-TYPE-ELEMENT");
    }
    x.close("SUB-ELEMENTS");
    x.close("IMPLEMENTATION-DATA-TYPE");
    return;
  }

  // APPLICATION-PRIMITIVE-DATA-TYPE
  x.open("APPLICATION-PRIMITIVE-DATA-TYPE");
  x.leaf("SHORT-NAME", dt.name);
  x.leaf("CATEGORY", dt.category === "BOOLEAN" ? "BOOLEAN" : "VALUE");
  x.open("SW-DATA-DEF-PROPS");
  x.open("SW-DATA-DEF-PROPS-VARIANTS");
  x.open("SW-DATA-DEF-PROPS-CONDITIONAL");
  x.leaf(
    "COMPU-METHOD-REF",
    `${root}/CompuMethods/${dt.category === "BOOLEAN" ? "Boolean" : "Identical"}`,
    'DEST="COMPU-METHOD"',
  );
  x.leaf(
    "DATA-CONSTR-REF",
    `${root}/DataTypes/${dt.name}_Constr`,
    'DEST="DATA-CONSTR"',
  );
  if (dt.unit) {
    x.leaf("UNIT-REF", `${root}/Units/${dt.unit}`, 'DEST="UNIT"');
  }
  x.close("SW-DATA-DEF-PROPS-CONDITIONAL");
  x.close("SW-DATA-DEF-PROPS-VARIANTS");
  x.close("SW-DATA-DEF-PROPS");
  x.close("APPLICATION-PRIMITIVE-DATA-TYPE");

  // IMPLEMENTATION-DATA-TYPE
  x.open("IMPLEMENTATION-DATA-TYPE");
  x.leaf("SHORT-NAME", `${dt.name}_Impl`);
  x.leaf("CATEGORY", "VALUE");
  x.open("SW-DATA-DEF-PROPS");
  x.open("SW-DATA-DEF-PROPS-VARIANTS");
  x.open("SW-DATA-DEF-PROPS-CONDITIONAL");
  x.leaf(
    "BASE-TYPE-REF",
    `${root}/BaseTypes/${dt.baseType}`,
    'DEST="SW-BASE-TYPE"',
  );
  x.close("SW-DATA-DEF-PROPS-CONDITIONAL");
  x.close("SW-DATA-DEF-PROPS-VARIANTS");
  x.close("SW-DATA-DEF-PROPS");
  x.open("TYPE-EMITTER");
  x.text("RTE");
  x.close("TYPE-EMITTER");
  x.close("IMPLEMENTATION-DATA-TYPE");

  // DATA-CONSTR
  x.open("DATA-CONSTR");
  x.leaf("SHORT-NAME", `${dt.name}_Constr`);
  x.open("DATA-CONSTR-RULES");
  x.open("DATA-CONSTR-RULE");
  x.open("INTERNAL-CONSTRS");
  x.leaf("LOWER-LIMIT", dt.lowerLimit, 'INTERVAL-TYPE="CLOSED"');
  x.leaf("UPPER-LIMIT", dt.upperLimit, 'INTERVAL-TYPE="CLOSED"');
  x.close("INTERNAL-CONSTRS");
  x.close("DATA-CONSTR-RULE");
  x.close("DATA-CONSTR-RULES");
  x.close("DATA-CONSTR");
}

function emitInterface(x: X, iface: InterfaceRow, root: string) {
  if (iface.kind === "sender-receiver") {
    x.open("SENDER-RECEIVER-INTERFACE");
    x.leaf("SHORT-NAME", iface.name);
    const els = srElements(iface);
    if (els.length > 0) {
      x.open("DATA-ELEMENTS");
      for (const el of els) {
        x.open("VARIABLE-DATA-PROTOTYPE");
        x.leaf("SHORT-NAME", el.name);
        x.leaf(
          "TYPE-TREF",
          `${root}/DataTypes/${el.typeRef}`,
          'DEST="APPLICATION-PRIMITIVE-DATA-TYPE"',
        );
        x.close("VARIABLE-DATA-PROTOTYPE");
      }
      x.close("DATA-ELEMENTS");
    }
    x.close("SENDER-RECEIVER-INTERFACE");
  } else {
    x.open("CLIENT-SERVER-INTERFACE");
    x.leaf("SHORT-NAME", iface.name);
    const ops = csOperations(iface);
    if (ops.length > 0) {
      x.open("OPERATIONS");
      for (const op of ops) {
        x.open("CLIENT-SERVER-OPERATION");
        x.leaf("SHORT-NAME", op.name);
        if (op.args.length > 0) {
          x.open("ARGUMENTS");
          for (const arg of op.args) {
            x.open("ARGUMENT-DATA-PROTOTYPE");
            x.leaf("SHORT-NAME", arg.name);
            x.open("SW-DATA-DEF-PROPS");
            x.open("SW-DATA-DEF-PROPS-VARIANTS");
            x.open("SW-DATA-DEF-PROPS-CONDITIONAL");
            x.close("SW-DATA-DEF-PROPS-CONDITIONAL");
            x.close("SW-DATA-DEF-PROPS-VARIANTS");
            x.close("SW-DATA-DEF-PROPS");
            x.leaf(
              "TYPE-TREF",
              `${root}/DataTypes/${arg.typeRef}`,
              'DEST="APPLICATION-PRIMITIVE-DATA-TYPE"',
            );
            x.leaf("DIRECTION", arg.direction);
            x.close("ARGUMENT-DATA-PROTOTYPE");
          }
          x.close("ARGUMENTS");
        }
        x.close("CLIENT-SERVER-OPERATION");
      }
      x.close("OPERATIONS");
    }
    x.close("CLIENT-SERVER-INTERFACE");
  }
}

function emitPort(
  x: X,
  port: PortRow,
  iface: InterfaceRow | undefined,
  root: string,
) {
  const provided = port.direction === "provided";
  x.open(provided ? "P-PORT-PROTOTYPE" : "R-PORT-PROTOTYPE");
  x.leaf("SHORT-NAME", port.name);
  if (iface) {
    const dest =
      iface.kind === "sender-receiver"
        ? "SENDER-RECEIVER-INTERFACE"
        : "CLIENT-SERVER-INTERFACE";
    if (provided) {
      x.open("PROVIDED-COM-SPECS");
      if (iface.kind === "sender-receiver") {
        x.open("NONQUEUED-SENDER-COM-SPEC");
        x.close("NONQUEUED-SENDER-COM-SPEC");
      } else {
        x.open("SERVER-COM-SPEC");
        x.leaf("QUEUE-LENGTH", "1");
        x.close("SERVER-COM-SPEC");
      }
      x.close("PROVIDED-COM-SPECS");
      x.leaf(
        "PROVIDED-INTERFACE-TREF",
        `${root}/Interfaces/${iface.name}`,
        `DEST="${dest}"`,
      );
    } else {
      x.open("REQUIRED-COM-SPECS");
      if (iface.kind === "sender-receiver") {
        x.open(
          port.queued
            ? "QUEUED-RECEIVER-COM-SPEC"
            : "NONQUEUED-RECEIVER-COM-SPEC",
        );
        x.leaf("ENABLE-UPDATE", "true");
        x.close(
          port.queued
            ? "QUEUED-RECEIVER-COM-SPEC"
            : "NONQUEUED-RECEIVER-COM-SPEC",
        );
      } else {
        x.open("CLIENT-COM-SPEC");
        x.close("CLIENT-COM-SPEC");
      }
      x.close("REQUIRED-COM-SPECS");
      x.leaf(
        "REQUIRED-INTERFACE-TREF",
        `${root}/Interfaces/${iface.name}`,
        `DEST="${dest}"`,
      );
    }
  }
  x.close(provided ? "P-PORT-PROTOTYPE" : "R-PORT-PROTOTYPE");
}

function emitSwc(
  x: X,
  swc: FullSwc,
  ifaces: InterfaceRow[],
  root: string,
) {
  const cat = SWC_CATEGORIES.find((c) => c.value === swc.category);
  const tag = cat?.arxmlTag ?? "APPLICATION-SOFTWARE-COMPONENT-TYPE";
  x.open(tag);
  x.leaf("SHORT-NAME", swc.name);
  if (swc.ports.length > 0) {
    x.open("PORTS");
    for (const p of swc.ports) {
      emitPort(x, p, ifaces.find((i) => i.id === p.interfaceId), root);
    }
    x.close("PORTS");
  }
  if (swc.runnables.length > 0) {
    const ibPath = `${root}/ComponentTypes/${swc.name}/${swc.name}_InternalBehavior`;
    x.open("INTERNAL-BEHAVIORS");
    x.open("SWC-INTERNAL-BEHAVIOR");
    x.leaf("SHORT-NAME", `${swc.name}_InternalBehavior`);
    x.open("EVENTS");
    for (const r of swc.runnables) {
      if (r.eventType === "init") {
        x.open("INIT-EVENT");
        x.leaf("SHORT-NAME", `${r.name}_InitEvent`);
        x.leaf("START-ON-EVENT-REF", `${ibPath}/${r.name}`, 'DEST="RUNNABLE-ENTITY"');
        x.close("INIT-EVENT");
      } else if (r.eventType === "timing") {
        x.open("TIMING-EVENT");
        x.leaf("SHORT-NAME", `${r.name}_TimingEvent`);
        x.leaf("START-ON-EVENT-REF", `${ibPath}/${r.name}`, 'DEST="RUNNABLE-ENTITY"');
        x.leaf("PERIOD", (r.periodMs / 1000).toString());
        x.close("TIMING-EVENT");
      } else {
        const target = resolveOperationTarget(swc, ifaces, r.operationPort);
        if (!target) {
          const safeName = esc(r.name);
          const safePort = esc(r.operationPort || "(미지정)");
          x.text(
            `<!-- ${safeName}: OPERATION-INVOKED-EVENT 생략됨 - '${safePort}' 포트가 C/S 인터페이스에 연결되어 있지 않거나 오퍼레이션이 없습니다. -->`,
          );
        } else {
          x.open("OPERATION-INVOKED-EVENT");
          x.leaf("SHORT-NAME", `${r.name}_OpInvokedEvent`);
          x.leaf("START-ON-EVENT-REF", `${ibPath}/${r.name}`, 'DEST="RUNNABLE-ENTITY"');
          x.open("OPERATION-IREF");
          x.leaf(
            "CONTEXT-P-PORT-REF",
            `${root}/ComponentTypes/${swc.name}/${target.port.name}`,
            'DEST="P-PORT-PROTOTYPE"',
          );
          x.leaf(
            "TARGET-PROVIDED-OPERATION-REF",
            `${root}/Interfaces/${target.iface.name}/${target.opName}`,
            'DEST="CLIENT-SERVER-OPERATION"',
          );
          x.close("OPERATION-IREF");
          x.close("OPERATION-INVOKED-EVENT");
        }
      }
    }
    x.close("EVENTS");
    x.open("RUNNABLES");
    for (const r of swc.runnables) {
      x.open("RUNNABLE-ENTITY");
      x.leaf("SHORT-NAME", r.name);
      x.leaf("SYMBOL", `${swc.name}_${r.name}`);
      x.close("RUNNABLE-ENTITY");
    }
    x.close("RUNNABLES");
    x.close("SWC-INTERNAL-BEHAVIOR");
    x.close("INTERNAL-BEHAVIORS");
  }
  x.close(tag);
}

function emitComposition(
  x: X,
  full: FullProject,
  root: string,
) {
  const compById = new Map(full.components.map((c) => [c.id, c]));
  x.open("COMPOSITION-SW-COMPONENT-TYPE");
  x.leaf("SHORT-NAME", "RootComposition");
  x.open("COMPONENTS");
  for (const c of full.components) {
    x.open("SW-COMPONENT-PROTOTYPE");
    x.leaf("SHORT-NAME", `${c.name}_Proto`);
    const cat = SWC_CATEGORIES.find((v) => v.value === c.category);
    x.leaf(
      "TYPE-TREF",
      `${root}/ComponentTypes/${c.name}`,
      `DEST="${cat?.dest ?? "APPLICATION-SOFTWARE-COMPONENT-TYPE"}"`,
    );
    x.close("SW-COMPONENT-PROTOTYPE");
  }
  x.close("COMPONENTS");

  const connectors = full.connections
    .map((conn, idx) => {
      const find = (portId: string) => {
        for (const [swcId, swc] of compById) {
          void swcId;
          const port = swc.ports.find((p) => p.id === portId);
          if (port) return { swc, port };
        }
        return null;
      };
      const src = find(conn.sourcePortId);
      const tgt = find(conn.targetPortId);
      if (!src || !tgt) return null;
      const provider =
        src.port.direction === "provided"
          ? src
          : tgt.port.direction === "provided"
            ? tgt
            : null;
      const requester =
        src.port.direction === "required"
          ? src
          : tgt.port.direction === "required"
            ? tgt
            : null;
      if (!provider || !requester) return null;
      return { provider, requester, idx };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (connectors.length > 0) {
    x.open("CONNECTORS");
    for (const { provider, requester, idx } of connectors) {
      x.open("ASSEMBLY-SW-CONNECTOR");
      x.leaf(
        "SHORT-NAME",
        `Conn_${provider.swc.name}_${provider.port.name}_${idx + 1}`,
      );
      x.open("PROVIDER-IREF");
      x.leaf(
        "CONTEXT-COMPOSITION-REF",
        `${root}/ComponentTypes/RootComposition`,
        'DEST="COMPOSITION-SW-COMPONENT-TYPE"',
      );
      x.leaf(
        "TARGET-P-PORT-REF",
        `${root}/ComponentTypes/${provider.swc.name}/${provider.port.name}`,
        'DEST="P-PORT-PROTOTYPE"',
      );
      x.close("PROVIDER-IREF");
      x.open("REQUESTER-IREF");
      x.leaf(
        "CONTEXT-COMPOSITION-REF",
        `${root}/ComponentTypes/RootComposition`,
        'DEST="COMPOSITION-SW-COMPONENT-TYPE"',
      );
      x.leaf(
        "TARGET-R-PORT-REF",
        `${root}/ComponentTypes/${requester.swc.name}/${requester.port.name}`,
        'DEST="R-PORT-PROTOTYPE"',
      );
      x.close("REQUESTER-IREF");
      x.close("ASSEMBLY-SW-CONNECTOR");
    }
    x.close("CONNECTORS");
  }
  x.close("COMPOSITION-SW-COMPONENT-TYPE");
}

/** 전체 프로젝트 그래프 → AUTOSAR Classic ARXML 문자열 */
export function generateArxml(full: FullProject): string {
  const { project, components, interfaces, dataTypes } = full;
  const ver = VERSION_SCHEMA[project.autosarVersion] ?? VERSION_SCHEMA["R23-11"];
  const root = `/${project.arPackageRoot.replace(/^\/+|\/+$/g, "")}`;
  const x = new X();

  x.text(`<?xml version="1.0" encoding="utf-8"?>`);
  x.open(
    "AUTOSAR",
    `xmlns="${ver.ns}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${ver.ns} ${ver.xsd}"`,
  );
  x.open("AR-PACKAGES");
  x.open("AR-PACKAGE");
  x.leaf("SHORT-NAME", project.arPackageRoot);
  x.open("AR-PACKAGES");

  // Interfaces
  x.open("AR-PACKAGE");
  x.leaf("SHORT-NAME", "Interfaces");
  if (interfaces.length > 0) {
    x.open("ELEMENTS");
    for (const iface of interfaces) emitInterface(x, iface, root);
    x.close("ELEMENTS");
  }
  x.close("AR-PACKAGE");

  // DataTypes
  x.open("AR-PACKAGE");
  x.leaf("SHORT-NAME", "DataTypes");
  if (dataTypes.length > 0) {
    x.open("ELEMENTS");
    for (const dt of dataTypes) emitDataType(x, dt, root, dataTypes);
    x.close("ELEMENTS");
  }
  x.close("AR-PACKAGE");

  // BaseTypes
  x.open("AR-PACKAGE");
  x.leaf("SHORT-NAME", "BaseTypes");
  x.open("ELEMENTS");
  const baseBits: Record<string, [string, string]> = {
    boolean: ["1", "BOOLEAN"],
    uint8: ["8", "NONE"],
    uint16: ["16", "NONE"],
    uint32: ["32", "NONE"],
    uint64: ["64", "NONE"],
    sint8: ["8", "2C"],
    sint16: ["16", "2C"],
    sint32: ["32", "2C"],
    sint64: ["64", "2C"],
    float32: ["32", "IEEE754"],
    float64: ["64", "IEEE754"],
  };
  for (const bt of Object.keys(baseBits)) {
    x.open("SW-BASE-TYPE");
    x.leaf("SHORT-NAME", bt);
    x.leaf("CATEGORY", "FIXED_LENGTH");
    x.leaf("BASE-TYPE-SIZE", baseBits[bt][0]);
    x.leaf("BASE-TYPE-ENCODING", baseBits[bt][1]);
    x.leaf("NATIVE-DECLARATION", bt);
    x.close("SW-BASE-TYPE");
  }
  x.close("ELEMENTS");
  x.close("AR-PACKAGE");

  // CompuMethods
  x.open("AR-PACKAGE");
  x.leaf("SHORT-NAME", "CompuMethods");
  x.open("ELEMENTS");
  x.open("COMPU-METHOD");
  x.leaf("SHORT-NAME", "Identical");
  x.leaf("CATEGORY", "IDENTICAL");
  x.close("COMPU-METHOD");
  x.open("COMPU-METHOD");
  x.leaf("SHORT-NAME", "Boolean");
  x.leaf("CATEGORY", "TEXTTABLE");
  x.open("COMPU-INTERNAL-TO-PHYS");
  x.open("COMPU-SCALES");
  for (const [v, label] of [
    ["0", "FALSE"],
    ["1", "TRUE"],
  ] as const) {
    x.open("COMPU-SCALE");
    x.leaf("LOWER-LIMIT", v, 'INTERVAL-TYPE="CLOSED"');
    x.leaf("UPPER-LIMIT", v, 'INTERVAL-TYPE="CLOSED"');
    x.open("COMPU-CONST");
    x.leaf("VT", label);
    x.close("COMPU-CONST");
    x.close("COMPU-SCALE");
  }
  x.close("COMPU-SCALES");
  x.close("COMPU-INTERNAL-TO-PHYS");
  x.close("COMPU-METHOD");
  x.close("ELEMENTS");
  x.close("AR-PACKAGE");

  // Units
  const units = [...new Set(dataTypes.map((d) => d.unit).filter(Boolean))];
  x.open("AR-PACKAGE");
  x.leaf("SHORT-NAME", "Units");
  if (units.length > 0) {
    x.open("ELEMENTS");
    for (const u of units) {
      x.open("UNIT");
      x.leaf("SHORT-NAME", u);
      x.leaf("DISPLAY-NAME", u);
      x.close("UNIT");
    }
    x.close("ELEMENTS");
  }
  x.close("AR-PACKAGE");

  // ComponentTypes
  x.open("AR-PACKAGE");
  x.leaf("SHORT-NAME", "ComponentTypes");
  if (components.length > 0) {
    x.open("ELEMENTS");
    for (const c of components) emitSwc(x, c, interfaces, root);
    emitComposition(x, full, root);
    x.close("ELEMENTS");
  }
  x.close("AR-PACKAGE");

  x.close("AR-PACKAGES");
  x.close("AR-PACKAGE");
  x.close("AR-PACKAGES");
  x.close("AUTOSAR");

  return x.toString();
}
