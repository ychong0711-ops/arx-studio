import type {
  ConnectionRow,
  DataTypeRow,
  InterfaceRow,
  PortRow,
  ProjectRow,
  RunnableRow,
  SwcRow,
} from "@/db/schema";
import type { FullProject } from "@/lib/types";

/** 모든 행의 createdAt/updatedAt에 사용하는 공통 시각 */
const TS = new Date("2026-01-01");

/**
 * 픽스처 ID (uuid 문자열 형태).
 * base 픽스처와 파생 픽스처 헬퍼가 같은 ID를 재사용하도록 export한다.
 */
export const ID = {
  project: "p1",
  ifaceSpeed: "10000000-0000-4000-8000-000000000001",
  ifaceMode: "10000000-0000-4000-8000-000000000002",
  dtSpeed: "10000000-0000-4000-8000-000000000011",
  dtBool: "10000000-0000-4000-8000-000000000012",
  dtSpeedArr: "10000000-0000-4000-8000-000000000013",
  dtSpeedRec: "10000000-0000-4000-8000-000000000014",
  swcSnsr: "10000000-0000-4000-8000-000000000021",
  swcCtrl: "10000000-0000-4000-8000-000000000022",
  swcBroken: "10000000-0000-4000-8000-000000000023",
  portPSpeed: "10000000-0000-4000-8000-000000000031",
  portRSpeed: "10000000-0000-4000-8000-000000000032",
  portPMode: "10000000-0000-4000-8000-000000000033",
  portRQueue: "10000000-0000-4000-8000-000000000034",
  portRNc: "10000000-0000-4000-8000-000000000035",
  runSnsrInit: "10000000-0000-4000-8000-000000000041",
  runSnsrRun: "10000000-0000-4000-8000-000000000042",
  runCtrlMain: "10000000-0000-4000-8000-000000000043",
  runCtrlOpInv: "10000000-0000-4000-8000-000000000044",
  runBrkBad: "10000000-0000-4000-8000-000000000045",
  connValid: "10000000-0000-4000-8000-000000000051",
  connSameDir: "10000000-0000-4000-8000-000000000052",
} as const;

const project: ProjectRow = {
  id: ID.project,
  name: "TestProj",
  arPackageRoot: "TEST",
  autosarVersion: "R23-11",
  schema: "classic",
  description: "Test & Demo <project>",
  createdAt: TS,
  updatedAt: TS,
};

const dataTypes: DataTypeRow[] = [
  {
    id: ID.dtSpeed,
    projectId: ID.project,
    name: "Speed_T",
    category: "VALUE",
    baseType: "uint16",
    lowerLimit: "0",
    upperLimit: "250",
    unit: "KmPerHour",
    elementType: "",
    maxSize: 0,
    elements: [],
    createdAt: TS,
  },
  {
    id: ID.dtBool,
    projectId: ID.project,
    name: "Bool_T",
    category: "BOOLEAN",
    baseType: "boolean",
    lowerLimit: "0",
    upperLimit: "1",
    unit: "",
    elementType: "",
    maxSize: 0,
    elements: [],
    createdAt: TS,
  },
  {
    id: ID.dtSpeedArr,
    projectId: ID.project,
    name: "SpeedArr_T",
    category: "ARRAY",
    baseType: "uint16",
    lowerLimit: "",
    upperLimit: "",
    unit: "",
    elementType: "Speed_T",
    maxSize: 8,
    elements: [],
    createdAt: TS,
  },
  {
    id: ID.dtSpeedRec,
    projectId: ID.project,
    name: "SpeedRec_T",
    category: "STRUCTURE",
    baseType: "",
    lowerLimit: "",
    upperLimit: "",
    unit: "",
    elementType: "",
    maxSize: 0,
    elements: [
      { name: "speed", typeRef: "Speed_T" },
      { name: "valid", typeRef: "Bool_T" },
    ],
    createdAt: TS,
  },
];

const interfaces: InterfaceRow[] = [
  {
    id: ID.ifaceSpeed,
    projectId: ID.project,
    name: "SpeedIf",
    kind: "sender-receiver",
    elements: [
      { name: "vehicleSpeed", typeRef: "Speed_T" },
      { name: "speedValid", typeRef: "Bool_T" },
    ],
    createdAt: TS,
  },
  {
    id: ID.ifaceMode,
    projectId: ID.project,
    name: "ModeIf",
    kind: "client-server",
    elements: [
      { name: "SetMode", args: [{ name: "mode", direction: "IN", typeRef: "Speed_T" }] },
    ],
    createdAt: TS,
  },
];

const components: FullProject["components"] = [
  {
    id: ID.swcSnsr,
    projectId: ID.project,
    name: "Snsr",
    category: "sensoractuator",
    description: "",
    x: 80,
    y: 80,
    createdAt: TS,
    ports: [
      {
        id: ID.portPSpeed,
        componentId: ID.swcSnsr,
        name: "P_Speed",
        direction: "provided",
        interfaceId: ID.ifaceSpeed,
        queued: false,
        createdAt: TS,
      },
    ],
    runnables: [
      {
        id: ID.runSnsrInit,
        componentId: ID.swcSnsr,
        name: "Snsr_Init",
        eventType: "init",
        periodMs: 0,
        operationPort: "",
        createdAt: TS,
      },
      {
        id: ID.runSnsrRun,
        componentId: ID.swcSnsr,
        name: "Snsr_Run",
        eventType: "timing",
        periodMs: 10,
        operationPort: "",
        createdAt: TS,
      },
    ],
  },
  {
    id: ID.swcCtrl,
    projectId: ID.project,
    name: "Ctrl",
    category: "application",
    description: "",
    x: 80,
    y: 80,
    createdAt: TS,
    ports: [
      {
        id: ID.portRSpeed,
        componentId: ID.swcCtrl,
        name: "R_Speed",
        direction: "required",
        interfaceId: ID.ifaceSpeed,
        queued: false,
        createdAt: TS,
      },
      {
        id: ID.portPMode,
        componentId: ID.swcCtrl,
        name: "P_Mode",
        direction: "provided",
        interfaceId: ID.ifaceMode,
        queued: false,
        createdAt: TS,
      },
      {
        id: ID.portRQueue,
        componentId: ID.swcCtrl,
        name: "R_Queue",
        direction: "required",
        interfaceId: ID.ifaceSpeed,
        queued: true,
        createdAt: TS,
      },
    ],
    runnables: [
      {
        id: ID.runCtrlMain,
        componentId: ID.swcCtrl,
        name: "Ctrl_Main",
        eventType: "timing",
        periodMs: 20,
        operationPort: "",
        createdAt: TS,
      },
      {
        id: ID.runCtrlOpInv,
        componentId: ID.swcCtrl,
        name: "Ctrl_OpInv",
        eventType: "operation-invoked",
        periodMs: 0,
        operationPort: "P_Mode",
        createdAt: TS,
      },
    ],
  },
  {
    id: ID.swcBroken,
    projectId: ID.project,
    name: "Broken",
    category: "application",
    description: "",
    x: 80,
    y: 80,
    createdAt: TS,
    ports: [
      {
        id: ID.portRNc,
        componentId: ID.swcBroken,
        name: "R_Nc",
        direction: "required",
        interfaceId: ID.ifaceSpeed,
        queued: false,
        createdAt: TS,
      },
    ],
    runnables: [
      {
        id: ID.runBrkBad,
        componentId: ID.swcBroken,
        name: "Brk_Bad",
        eventType: "operation-invoked",
        periodMs: 0,
        operationPort: "NoSuchPort",
        createdAt: TS,
      },
    ],
  },
];

const connections: ConnectionRow[] = [
  {
    id: ID.connValid,
    projectId: ID.project,
    sourcePortId: ID.portPSpeed, // Snsr.P_Speed (provided)
    targetPortId: ID.portRSpeed, // Ctrl.R_Speed (required) → 유효
    createdAt: TS,
  },
  {
    id: ID.connSameDir,
    projectId: ID.project,
    sourcePortId: ID.portRNc, // Broken.R_Nc (required)
    targetPortId: ID.portRSpeed, // Ctrl.R_Speed (required) → 같은 방향 → 무효
    createdAt: TS,
  },
];

const baseFixture: FullProject = { project, components, interfaces, dataTypes, connections };

/**
 * 기본(스펙 원문) 픽스처를 매 호출 새로 만들어 반환한다.
 * arxml/rte 검증용: 의도적으로 Broken(Brk_Bad)과 같은 방향 커넥터를 포함한다.
 */
export function buildFixture(): FullProject {
  return structuredClone(baseFixture);
}

/**
 * 검증 '정상' 픽스처: 잘못된 요소(무효 커넥터, 존재하지 않는 포트 참조 러너블)를 제거해
 * validateProject가 error를 0건 보고한다.
 */
export function validProject(): FullProject {
  const f = buildFixture();
  return {
    ...f,
    connections: f.connections.filter((c) => c.id !== ID.connSameDir),
    components: f.components.map((c) =>
      c.id === ID.swcBroken ? { ...c, runnables: [] } : c,
    ),
  };
}

/** SWC 이름 중복 파생: Ctrl → Snsr */
export function withDuplicateSwcName(source: FullProject = validProject()): FullProject {
  return {
    ...source,
    components: source.components.map((c) =>
      c.name === "Ctrl" ? { ...c, name: "Snsr" } : c,
    ),
  };
}

/** SR 요소가 정의되지 않은 DataType을 참조하는 파생: vehicleSpeed.typeRef → "Speediff" */
export function withUndefinedSrType(source: FullProject = validProject()): FullProject {
  return {
    ...source,
    interfaces: source.interfaces.map((i) =>
      i.name === "SpeedIf"
        ? {
            ...i,
            elements: [
              { name: "vehicleSpeed", typeRef: "Speediff" },
              { name: "speedValid", typeRef: "Bool_T" },
            ],
          }
        : i,
    ),
  };
}

/** 같은 방향(required↔required) 커넥터 추가 */
export function withSameDirectionConnection(source: FullProject = validProject()): FullProject {
  return {
    ...source,
    connections: [
      ...source.connections,
      {
        id: "10000000-0000-4000-8000-000000000052",
        projectId: ID.project,
        sourcePortId: ID.portRNc,
        targetPortId: ID.portRSpeed,
        createdAt: TS,
      },
    ],
  };
}

/** 인터페이스 종류 불일치(SR↔CS) 커넥터 추가: Ctrl.R_Speed(SR) ↔ Ctrl.P_Mode(CS) */
export function withInterfaceMismatchConnection(source: FullProject = validProject()): FullProject {
  return {
    ...source,
    connections: [
      ...source.connections,
      {
        id: "10000000-0000-4000-8000-000000000053",
        projectId: ID.project,
        sourcePortId: ID.portRSpeed,
        targetPortId: ID.portPMode,
        createdAt: TS,
      },
    ],
  };
}

/** ARRAY elementType이 빈 문자열인 파생 */
export function withEmptyArrayElementType(source: FullProject = validProject()): FullProject {
  return {
    ...source,
    dataTypes: source.dataTypes.map((d) =>
      d.category === "ARRAY" ? { ...d, elementType: "" } : d,
    ),
  };
}

/** ARRAY elementType이 미정의 타입인 파생 */
export function withUndefinedArrayElementType(source: FullProject = validProject()): FullProject {
  return {
    ...source,
    dataTypes: source.dataTypes.map((d) =>
      d.category === "ARRAY" ? { ...d, elementType: "Ghost_T" } : d,
    ),
  };
}

/** STRUCTURE 멤버 typeRef가 미정의인 파생 */
export function withUndefinedStructureMember(source: FullProject = validProject()): FullProject {
  return {
    ...source,
    dataTypes: source.dataTypes.map((d) =>
      d.category === "STRUCTURE"
        ? {
            ...d,
            elements: [
              { name: "speed", typeRef: "Ghost_T" },
              { name: "valid", typeRef: "Bool_T" },
            ],
          }
        : d,
    ),
  };
}

/** operation-invoked 러너블이 존재하지 않는 포트를 참조하는 파생 (Broken/Brk_Bad 재추가) */
export function withBadOperationPort(source: FullProject = validProject()): FullProject {
  return {
    ...source,
    components: source.components.map((c) =>
      c.id === ID.swcBroken
        ? {
            ...c,
runnables: [
      {
        id: ID.runBrkBad,
        componentId: c.id,
        name: "Brk_Bad",
        eventType: "operation-invoked",
        periodMs: 0,
        operationPort: "NoSuchPort",
        createdAt: TS,
      },
    ],
          }
        : c,
    ),
  };
}