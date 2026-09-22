import {
  csOperations,
  isValidShortName,
  srElements,
  type FullProject,
  type ProjectIssue,
} from "@/lib/types";

/** 프로젝트 AUTOSAR 준수 검증 */
export function validateProject(full: FullProject): ProjectIssue[] {
  const issues: ProjectIssue[] = [];
  const { project, components, interfaces, dataTypes, connections } = full;

  const chk = (target: string, name: string, label: string) => {
    if (!isValidShortName(name)) {
      issues.push({
        level: "error",
        target,
        message: `${label} 이름 '${name}'은(는) AUTOSAR SHORT-NAME 규칙에 맞지 않습니다.`,
      });
    }
  };

  chk("프로젝트", project.arPackageRoot, "AR-PACKAGE");
  if (project.name.includes(" ")) {
    issues.push({
      level: "warning",
      target: "프로젝트",
      message: "프로젝트 이름에 공백이 포함되어 있습니다.",
    });
  }

  const dupCheck = (names: string[], kind: string) => {
    const seen = new Map<string, number>();
    for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1);
    for (const [n, c] of seen) {
      if (c > 1)
        issues.push({
          level: "error",
          target: kind,
          message: `중복된 ${kind} 이름 '${n}' (${c}건)`,
        });
    }
  };

  dupCheck(components.map((c) => c.name), "SWC");
  dupCheck(interfaces.map((i) => i.name), "인터페이스");
  dupCheck(dataTypes.map((d) => d.name), "데이터타입");

  const dtNames = new Set(dataTypes.map((d) => d.name));

  // ARRAY / STRUCTURE 전용 검증
  for (const d of dataTypes) {
    if (d.category === "ARRAY") {
      if (!d.elementType) {
        issues.push({
          level: "error",
          target: d.name,
          message: "배열 요소 타입이 지정되지 않았습니다.",
        });
      } else if (!dtNames.has(d.elementType)) {
        issues.push({
          level: "error",
          target: d.name,
          message: `배열 요소 타입 '${d.elementType}'이(가) 정의되지 않았습니다.`,
        });
      }
    }
    if (d.category === "STRUCTURE") {
      const members = d.elements ?? [];
      if (members.length === 0) {
        issues.push({
          level: "warning",
          target: d.name,
          message: "구조체 멤버가 없는 타입입니다.",
        });
      }
      for (const m of members) {
        if (!dtNames.has(m.typeRef)) {
          issues.push({
            level: "error",
            target: d.name,
            message: `구조체 멤버 '${m.name}'이(가) 정의되지 않은 타입 '${m.typeRef}'을(를) 참조합니다.`,
          });
        }
      }
    }
  }

  for (const iface of interfaces) {
    chk("인터페이스", iface.name, "인터페이스");
    if (iface.kind === "sender-receiver") {
      const els = srElements(iface);
      if (els.length === 0)
        issues.push({
          level: "warning",
          target: iface.name,
          message: "데이터 요소가 없는 Sender-Receiver 인터페이스입니다.",
        });
      for (const el of els) {
        if (!dtNames.has(el.typeRef))
          issues.push({
            level: "error",
            target: iface.name,
            message: `데이터 요소 '${el.name}'이(가) 정의되지 않은 타입 '${el.typeRef}'을(를) 참조합니다.`,
          });
      }
    } else {
      for (const op of csOperations(iface)) {
        for (const arg of op.args) {
          if (!dtNames.has(arg.typeRef))
            issues.push({
              level: "error",
              target: iface.name,
              message: `연산 '${op.name}'의 인자 '${arg.name}'이(가) 정의되지 않은 타입 '${arg.typeRef}'을(를) 참조합니다.`,
            });
        }
      }
    }
  }

  const portById = new Map<string, { name: string; direction: string; iface: string | null; swc: string }>();
  for (const swc of components) {
    chk("SWC", swc.name, "SWC");
    for (const p of swc.ports) {
      chk("포트", p.name, "포트");
      const iface = interfaces.find((i) => i.id === p.interfaceId);
      portById.set(p.id, {
        name: p.name,
        direction: p.direction,
        iface: iface?.kind ?? null,
        swc: swc.name,
      });
      if (!p.interfaceId) {
        issues.push({
          level: "warning",
          target: `${swc.name}.${p.name}`,
          message: "인터페이스가 지정되지 않은 포트입니다. ARXML에 타입 참조가 생성되지 않습니다.",
        });
      }
    }
    for (const r of swc.runnables) {
      chk("Runnable", r.name, "Runnable");
      if (r.eventType === "timing" && r.periodMs <= 0) {
        issues.push({
          level: "error",
          target: r.name,
          message: "주기(period)는 0보다 커야 합니다.",
        });
      }
      if (r.eventType === "operation-invoked") {
        if (!r.operationPort) {
          issues.push({
            level: "error",
            target: r.name,
            message:
              "OperationInvokedEvent Runnable에는 대상 P-Port가 지정되어야 합니다.",
          });
        } else {
          const port = swc.ports.find(
            (p) => p.name === r.operationPort && p.direction === "provided",
          );
          if (!port) {
            issues.push({
              level: "error",
              target: r.name,
              message: `대상 포트 '${r.operationPort}'가 이 SWC의 P-Port 목록에 없습니다.`,
            });
          } else {
            const iface = interfaces.find((i) => i.id === port.interfaceId);
            if (!iface || iface.kind !== "client-server") {
              issues.push({
                level: "error",
                target: r.name,
                message: `포트 '${r.operationPort}'는 Client-Server 인터페이스에 연결되어 있지 않아 오퍼레이션을 참조할 수 없습니다.`,
              });
            } else if (csOperations(iface).length === 0) {
              issues.push({
                level: "error",
                target: r.name,
                message: `인터페이스 '${iface.name}'에 정의된 오퍼레이션이 없습니다.`,
              });
            }
          }
        }
      }
    }
  }

  for (const conn of connections) {
    const s = portById.get(conn.sourcePortId);
    const t = portById.get(conn.targetPortId);
    if (!s || !t) {
      issues.push({
        level: "error",
        target: "커넥터",
        message: "존재하지 않는 포트를 참조하는 커넥터가 있습니다.",
      });
      continue;
    }
    if (s.direction === t.direction) {
      issues.push({
        level: "error",
        target: `${s.swc}.${s.name}`,
        message: `커넥터는 P-Port ↔ R-Port 쌍이어야 합니다 (${s.name} ↔ ${t.name}).`,
      });
    }
    if (s.iface && t.iface && s.iface !== t.iface) {
      issues.push({
        level: "error",
        target: `${s.swc}.${s.name}`,
        message: `연결된 포트의 인터페이스 종류가 다릅니다 (${s.iface} vs ${t.iface}).`,
      });
    }
  }

  return issues;
}
