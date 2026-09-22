import type {
  ConnectionRow,
  DataTypeRow,
  InterfaceRow,
  PortRow,
  ProjectRow,
  RunnableRow,
} from "@/db/schema";
import type { FullProject } from "@/lib/types";

/**
 * ACC(Adaptive Cruise Control) 데모 프로젝트를 DB 없이 순수 데이터로 재현한다.
 * src/lib/seed.ts 의 seedDemoProject() 가 삽입하는 모델과 1:1로 동일하며,
 * 런타임에 DB/drizzle 모듈을 전혀 import 하지 않는다(타입 import 만 사용).
 * 커넥트 헤더(Rte_*) 생성 및 호스트-C 컴파일 검증의 입력으로 사용된다.
 */

/** 모든 행의 createdAt/updatedAt 에 사용하는 공통 시각 */
const TS = new Date("2026-01-01");

/** ACC 데모 고정 ID (uuid 형식 문자열) — seed.ts 의 삽입 순서와 동일하게 부여 */
export const ID = {
  project: "20000000-0000-4000-8000-000000000001",

  dtVehicleSpeed: "20000000-0000-4000-8000-000000000011",
  dtDistance: "20000000-0000-4000-8000-000000000012",
  dtPercent: "20000000-0000-4000-8000-000000000013",
  dtBoolean: "20000000-0000-4000-8000-000000000014",
  dtAccMode: "20000000-0000-4000-8000-000000000015",

  ifaceVehicleSpeed: "20000000-0000-4000-8000-000000000021",
  ifaceTargetObj: "20000000-0000-4000-8000-000000000022",
  ifaceThrottleCmd: "20000000-0000-4000-8000-000000000023",
  ifaceBrakeCmd: "20000000-0000-4000-8000-000000000024",
  ifaceAccMode: "20000000-0000-4000-8000-000000000025",

  swcVehicleSpdSnsr: "20000000-0000-4000-8000-000000000031",
  swcFrntRadarCtrl: "20000000-0000-4000-8000-000000000032",
  swcAccCtrl: "20000000-0000-4000-8000-000000000033",
  swcHmiModeMgr: "20000000-0000-4000-8000-000000000034",
  swcThrottleActr: "20000000-0000-4000-8000-000000000035",
  swcBrakeActr: "20000000-0000-4000-8000-000000000036",

  portPVehicleSpeed: "20000000-0000-4000-8000-000000000041",
  portPTargetObj: "20000000-0000-4000-8000-000000000042",
  portRVehicleSpeed: "20000000-0000-4000-8000-000000000043",
  portRTargetObj: "20000000-0000-4000-8000-000000000044",
  portPThrottleCmd: "20000000-0000-4000-8000-000000000045",
  portPBrakeCmd: "20000000-0000-4000-8000-000000000046",
  portPAccMode: "20000000-0000-4000-8000-000000000047",
  portRAccMode: "20000000-0000-4000-8000-000000000048",
  portRThrottleCmd: "20000000-0000-4000-8000-000000000049",
  portRBrakeCmd: "20000000-0000-4000-8000-00000000004a",

  runSpdSnsrInit: "20000000-0000-4000-8000-000000000051",
  runSpdSnsrRun: "20000000-0000-4000-8000-000000000052",
  runRadarInit: "20000000-0000-4000-8000-000000000053",
  runRadarRun: "20000000-0000-4000-8000-000000000054",
  runAccInit: "20000000-0000-4000-8000-000000000055",
  runAccMain: "20000000-0000-4000-8000-000000000056",
  runAccModeRequest: "20000000-0000-4000-8000-000000000057",
  runHmiInit: "20000000-0000-4000-8000-000000000058",
  runHmiRun: "20000000-0000-4000-8000-000000000059",
  runThrottleRun: "20000000-0000-4000-8000-00000000005a",
  runBrakeRun: "20000000-0000-4000-8000-00000000005b",

  connVehicleSpeed: "20000000-0000-4000-8000-000000000061",
  connTargetObj: "20000000-0000-4000-8000-000000000062",
  connThrottleCmd: "20000000-0000-4000-8000-000000000063",
  connBrakeCmd: "20000000-0000-4000-8000-000000000064",
  connAccMode: "20000000-0000-4000-8000-000000000065",
} as const;

const project: ProjectRow = {
  id: ID.project,
  name: "AdaptiveCruiseControl",
  arPackageRoot: "ACC",
  autosarVersion: "R23-11",
  schema: "classic",
  description:
    "전방 레이더 기반 어댑티브 크루즈 컨트롤(ACC) ECU 소프트웨어 컴포넌트 모델. Classic Platform R23-11 스키마.",
  createdAt: TS,
  updatedAt: TS,
};

// ── Data Types (seed.ts 와 동일) ──────────────────────────────
const dataTypes: DataTypeRow[] = [
  {
    id: ID.dtVehicleSpeed,
    projectId: ID.project,
    name: "VehicleSpeed_T",
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
    id: ID.dtDistance,
    projectId: ID.project,
    name: "Distance_T",
    category: "VALUE",
    baseType: "uint16",
    lowerLimit: "0",
    upperLimit: "200",
    unit: "Meter",
    elementType: "",
    maxSize: 0,
    elements: [],
    createdAt: TS,
  },
  {
    id: ID.dtPercent,
    projectId: ID.project,
    name: "Percent_T",
    category: "VALUE",
    baseType: "uint8",
    lowerLimit: "0",
    upperLimit: "100",
    unit: "Percent",
    elementType: "",
    maxSize: 0,
    elements: [],
    createdAt: TS,
  },
  {
    id: ID.dtBoolean,
    projectId: ID.project,
    name: "Boolean_T",
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
    id: ID.dtAccMode,
    projectId: ID.project,
    name: "AccMode_T",
    category: "VALUE",
    baseType: "uint8",
    lowerLimit: "0",
    upperLimit: "4",
    unit: "",
    elementType: "",
    maxSize: 0,
    elements: [],
    createdAt: TS,
  },
];

// ── Interfaces (seed.ts 와 동일) ──────────────────────────────
const interfaces: InterfaceRow[] = [
  {
    id: ID.ifaceVehicleSpeed,
    projectId: ID.project,
    name: "VehicleSpeed_If",
    kind: "sender-receiver",
    elements: [
      { name: "vehicleSpeed", typeRef: "VehicleSpeed_T" },
      { name: "speedValid", typeRef: "Boolean_T" },
    ],
    createdAt: TS,
  },
  {
    id: ID.ifaceTargetObj,
    projectId: ID.project,
    name: "TargetObj_If",
    kind: "sender-receiver",
    elements: [
      { name: "objDistance", typeRef: "Distance_T" },
      { name: "objValid", typeRef: "Boolean_T" },
    ],
    createdAt: TS,
  },
  {
    id: ID.ifaceThrottleCmd,
    projectId: ID.project,
    name: "ThrottleCmd_If",
    kind: "sender-receiver",
    elements: [{ name: "throttleReq", typeRef: "Percent_T" }],
    createdAt: TS,
  },
  {
    id: ID.ifaceBrakeCmd,
    projectId: ID.project,
    name: "BrakeCmd_If",
    kind: "sender-receiver",
    elements: [{ name: "brakeReq", typeRef: "Percent_T" }],
    createdAt: TS,
  },
  {
    id: ID.ifaceAccMode,
    projectId: ID.project,
    name: "AccMode_If",
    kind: "client-server",
    elements: [
      {
        name: "SetAccMode",
        args: [{ name: "mode", direction: "IN", typeRef: "AccMode_T" }],
      },
      {
        name: "GetAccMode",
        args: [{ name: "mode", direction: "OUT", typeRef: "AccMode_T" }],
      },
    ],
    createdAt: TS,
  },
];

// ── Ports (seed.ts 와 동일) ───────────────────────────────────
const port = (
  id: string,
  componentId: string,
  name: string,
  direction: "provided" | "required",
  interfaceId: string,
  queued = false,
): PortRow => ({
  id,
  componentId,
  name,
  direction,
  interfaceId,
  queued,
  createdAt: TS,
});

const ports: PortRow[] = [
  port(ID.portPVehicleSpeed, ID.swcVehicleSpdSnsr, "P_VehicleSpeed", "provided", ID.ifaceVehicleSpeed),
  port(ID.portPTargetObj, ID.swcFrntRadarCtrl, "P_TargetObj", "provided", ID.ifaceTargetObj),
  port(ID.portRVehicleSpeed, ID.swcAccCtrl, "R_VehicleSpeed", "required", ID.ifaceVehicleSpeed),
  port(ID.portRTargetObj, ID.swcAccCtrl, "R_TargetObj", "required", ID.ifaceTargetObj),
  port(ID.portPThrottleCmd, ID.swcAccCtrl, "P_ThrottleCmd", "provided", ID.ifaceThrottleCmd),
  port(ID.portPBrakeCmd, ID.swcAccCtrl, "P_BrakeCmd", "provided", ID.ifaceBrakeCmd),
  port(ID.portPAccMode, ID.swcAccCtrl, "P_AccMode", "provided", ID.ifaceAccMode),
  port(ID.portRAccMode, ID.swcHmiModeMgr, "R_AccMode", "required", ID.ifaceAccMode),
  port(ID.portRThrottleCmd, ID.swcThrottleActr, "R_ThrottleCmd", "required", ID.ifaceThrottleCmd),
  port(ID.portRBrakeCmd, ID.swcBrakeActr, "R_BrakeCmd", "required", ID.ifaceBrakeCmd),
];

// ── Runnables (seed.ts 와 동일) ───────────────────────────────
const runnable = (
  id: string,
  componentId: string,
  name: string,
  eventType: "timing" | "init" | "operation-invoked",
  options: { periodMs?: number; operationPort?: string } = {},
): RunnableRow => ({
  id,
  componentId,
  name,
  eventType,
  periodMs: options.periodMs ?? 10,
  operationPort: options.operationPort ?? "",
  createdAt: TS,
});

const runnables: RunnableRow[] = [
  runnable(ID.runSpdSnsrInit, ID.swcVehicleSpdSnsr, "VehicleSpdSnsr_Init", "init"),
  runnable(ID.runSpdSnsrRun, ID.swcVehicleSpdSnsr, "VehicleSpdSnsr_Run", "timing", { periodMs: 10 }),
  runnable(ID.runRadarInit, ID.swcFrntRadarCtrl, "FrntRadarCtrl_Init", "init"),
  runnable(ID.runRadarRun, ID.swcFrntRadarCtrl, "FrntRadarCtrl_Run", "timing", { periodMs: 20 }),
  runnable(ID.runAccInit, ID.swcAccCtrl, "AccCtrl_Init", "init"),
  runnable(ID.runAccMain, ID.swcAccCtrl, "AccCtrl_Main", "timing", { periodMs: 20 }),
  runnable(ID.runAccModeRequest, ID.swcAccCtrl, "AccCtrl_ModeRequest", "operation-invoked", {
    operationPort: "P_AccMode",
  }),
  runnable(ID.runHmiInit, ID.swcHmiModeMgr, "HmiModeMgr_Init", "init"),
  runnable(ID.runHmiRun, ID.swcHmiModeMgr, "HmiModeMgr_Run", "timing", { periodMs: 50 }),
  runnable(ID.runThrottleRun, ID.swcThrottleActr, "ThrottleActr_Run", "timing", { periodMs: 10 }),
  runnable(ID.runBrakeRun, ID.swcBrakeActr, "BrakeActr_Run", "timing", { periodMs: 10 }),
];

// ── SWCs (포트/러너블 포함, seed.ts 와 동일) ──────────────────
const components: FullProject["components"] = [
  {
    id: ID.swcVehicleSpdSnsr,
    projectId: ID.project,
    name: "VehicleSpdSnsr",
    category: "sensoractuator",
    description: "차속 센서 입력 처리 및 유효성 검증",
    x: 60,
    y: 40,
    createdAt: TS,
    ports: ports.filter((p) => p.componentId === ID.swcVehicleSpdSnsr),
    runnables: runnables.filter((r) => r.componentId === ID.swcVehicleSpdSnsr),
  },
  {
    id: ID.swcFrntRadarCtrl,
    projectId: ID.project,
    name: "FrntRadarCtrl",
    category: "sensoractuator",
    description: "전방 레이더 선행차량 타겟 추출",
    x: 60,
    y: 340,
    createdAt: TS,
    ports: ports.filter((p) => p.componentId === ID.swcFrntRadarCtrl),
    runnables: runnables.filter((r) => r.componentId === ID.swcFrntRadarCtrl),
  },
  {
    id: ID.swcAccCtrl,
    projectId: ID.project,
    name: "AccCtrl",
    category: "application",
    description: "ACC 핵심 제어 로직 (차간거리/가감속 결정)",
    x: 480,
    y: 180,
    createdAt: TS,
    ports: ports.filter((p) => p.componentId === ID.swcAccCtrl),
    runnables: runnables.filter((r) => r.componentId === ID.swcAccCtrl),
  },
  {
    id: ID.swcHmiModeMgr,
    projectId: ID.project,
    name: "HmiModeMgr",
    category: "application",
    description: "운전자 HMI 모드 요청 처리 (Client)",
    x: 480,
    y: 480,
    createdAt: TS,
    ports: ports.filter((p) => p.componentId === ID.swcHmiModeMgr),
    runnables: runnables.filter((r) => r.componentId === ID.swcHmiModeMgr),
  },
  {
    id: ID.swcThrottleActr,
    projectId: ID.project,
    name: "ThrottleActr",
    category: "sensoractuator",
    description: "스로틀 개도율 액추에이터 구동",
    x: 920,
    y: 60,
    createdAt: TS,
    ports: ports.filter((p) => p.componentId === ID.swcThrottleActr),
    runnables: runnables.filter((r) => r.componentId === ID.swcThrottleActr),
  },
  {
    id: ID.swcBrakeActr,
    projectId: ID.project,
    name: "BrakeActr",
    category: "sensoractuator",
    description: "제동 압력 액추에이터 구동",
    x: 920,
    y: 340,
    createdAt: TS,
    ports: ports.filter((p) => p.componentId === ID.swcBrakeActr),
    runnables: runnables.filter((r) => r.componentId === ID.swcBrakeActr),
  },
];

// ── Connections (Assembly Connectors, seed.ts 와 동일) ────────
const connections: ConnectionRow[] = [
  {
    id: ID.connVehicleSpeed,
    projectId: ID.project,
    sourcePortId: ID.portPVehicleSpeed,
    targetPortId: ID.portRVehicleSpeed,
    createdAt: TS,
  },
  {
    id: ID.connTargetObj,
    projectId: ID.project,
    sourcePortId: ID.portPTargetObj,
    targetPortId: ID.portRTargetObj,
    createdAt: TS,
  },
  {
    id: ID.connThrottleCmd,
    projectId: ID.project,
    sourcePortId: ID.portPThrottleCmd,
    targetPortId: ID.portRThrottleCmd,
    createdAt: TS,
  },
  {
    id: ID.connBrakeCmd,
    projectId: ID.project,
    sourcePortId: ID.portPBrakeCmd,
    targetPortId: ID.portRBrakeCmd,
    createdAt: TS,
  },
  {
    id: ID.connAccMode,
    projectId: ID.project,
    sourcePortId: ID.portPAccMode,
    targetPortId: ID.portRAccMode,
    createdAt: TS,
  },
];

/**
 * ACC 데모 FullProject 를 매 호출 새로 만들어 반환한다.
 * 생성자(arxml/rte) 검증 및 호스트-C 계약 빌드 데모의 입력으로 사용한다.
 */
export function buildAccDemo(): FullProject {
  return {
    project,
    components,
    interfaces,
    dataTypes,
    connections,
  };
}