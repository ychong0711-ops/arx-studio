import { db } from "@/db";
import {
  connections,
  dataTypes,
  interfaces,
  ports,
  projects,
  runnables,
  softwareComponents,
} from "@/db/schema";
import type { CsOperation, SrElement } from "@/lib/types";

/**
 * 데모 프로젝트: 차선유지/자율주행 대신 현실적인
 * ACC(Adaptive Cruise Control) Classic AUTOSAR 예제
 */
export async function seedDemoProject(): Promise<string> {
  const [project] = await db
    .insert(projects)
    .values({
      name: "AdaptiveCruiseControl",
      arPackageRoot: "ACC",
      autosarVersion: "R23-11",
      schema: "classic",
      description:
        "전방 레이더 기반 어댑티브 크루즈 컨트롤(ACC) ECU 소프트웨어 컴포넌트 모델. Classic Platform R23-11 스키마.",
    })
    .returning({ id: projects.id });
  const pid = project.id;

  // ── Data Types ────────────────────────────────────────────
  const dt = await db
    .insert(dataTypes)
    .values([
      {
        projectId: pid,
        name: "VehicleSpeed_T",
        category: "VALUE",
        baseType: "uint16",
        lowerLimit: "0",
        upperLimit: "250",
        unit: "KmPerHour",
      },
      {
        projectId: pid,
        name: "Distance_T",
        category: "VALUE",
        baseType: "uint16",
        lowerLimit: "0",
        upperLimit: "200",
        unit: "Meter",
      },
      {
        projectId: pid,
        name: "Percent_T",
        category: "VALUE",
        baseType: "uint8",
        lowerLimit: "0",
        upperLimit: "100",
        unit: "Percent",
      },
      {
        projectId: pid,
        name: "Boolean_T",
        category: "BOOLEAN",
        baseType: "boolean",
        lowerLimit: "0",
        upperLimit: "1",
      },
      {
        projectId: pid,
        name: "AccMode_T",
        category: "VALUE",
        baseType: "uint8",
        lowerLimit: "0",
        upperLimit: "4",
      },
    ])
    .returning({ id: dataTypes.id, name: dataTypes.name });

  // ── Interfaces ────────────────────────────────────────────
  const sr = (name: string, elements: SrElement[]) => ({
    projectId: pid,
    name,
    kind: "sender-receiver",
    elements: elements as unknown[],
  });
  const cs = (name: string, ops: CsOperation[]) => ({
    projectId: pid,
    name,
    kind: "client-server",
    elements: ops as unknown[],
  });

  const [ifSpeed, ifTarget, ifThrottle, ifBrake, ifMode] = await db
    .insert(interfaces)
    .values([
      sr("VehicleSpeed_If", [
        { name: "vehicleSpeed", typeRef: "VehicleSpeed_T" },
        { name: "speedValid", typeRef: "Boolean_T" },
      ]),
      sr("TargetObj_If", [
        { name: "objDistance", typeRef: "Distance_T" },
        { name: "objValid", typeRef: "Boolean_T" },
      ]),
      sr("ThrottleCmd_If", [{ name: "throttleReq", typeRef: "Percent_T" }]),
      sr("BrakeCmd_If", [{ name: "brakeReq", typeRef: "Percent_T" }]),
      cs("AccMode_If", [
        {
          name: "SetAccMode",
          args: [{ name: "mode", direction: "IN", typeRef: "AccMode_T" }],
        },
        {
          name: "GetAccMode",
          args: [{ name: "mode", direction: "OUT", typeRef: "AccMode_T" }],
        },
      ]),
    ])
    .returning({ id: interfaces.id });

  // ── SWCs ──────────────────────────────────────────────────
  const [spdSnsr, radar, accCtrl, thrActr, brkActr, hmi] = await db
    .insert(softwareComponents)
    .values([
      {
        projectId: pid,
        name: "VehicleSpdSnsr",
        category: "sensoractuator",
        description: "차속 센서 입력 처리 및 유효성 검증",
        x: 60,
        y: 40,
      },
      {
        projectId: pid,
        name: "FrntRadarCtrl",
        category: "sensoractuator",
        description: "전방 레이더 선행차량 타겟 추출",
        x: 60,
        y: 340,
      },
      {
        projectId: pid,
        name: "AccCtrl",
        category: "application",
        description: "ACC 핵심 제어 로직 (차간거리/가감속 결정)",
        x: 480,
        y: 180,
      },
      {
        projectId: pid,
        name: "HmiModeMgr",
        category: "application",
        description: "운전자 HMI 모드 요청 처리 (Client)",
        x: 480,
        y: 480,
      },
      {
        projectId: pid,
        name: "ThrottleActr",
        category: "sensoractuator",
        description: "스로틀 개도율 액추에이터 구동",
        x: 920,
        y: 60,
      },
      {
        projectId: pid,
        name: "BrakeActr",
        category: "sensoractuator",
        description: "제동 압력 액추에이터 구동",
        x: 920,
        y: 340,
      },
    ])
    .returning({ id: softwareComponents.id });

  // ── Ports ─────────────────────────────────────────────────
  const p = (
    componentId: string,
    name: string,
    direction: "provided" | "required",
    interfaceId: string,
    queued = false,
  ) => ({ componentId, name, direction, interfaceId, queued });

  const insertedPorts = await db
    .insert(ports)
    .values([
      p(spdSnsr.id, "P_VehicleSpeed", "provided", ifSpeed.id),
      p(radar.id, "P_TargetObj", "provided", ifTarget.id),
      p(accCtrl.id, "R_VehicleSpeed", "required", ifSpeed.id),
      p(accCtrl.id, "R_TargetObj", "required", ifTarget.id),
      p(accCtrl.id, "P_ThrottleCmd", "provided", ifThrottle.id),
      p(accCtrl.id, "P_BrakeCmd", "provided", ifBrake.id),
      p(accCtrl.id, "P_AccMode", "provided", ifMode.id),
      p(hmi.id, "R_AccMode", "required", ifMode.id),
      p(thrActr.id, "R_ThrottleCmd", "required", ifThrottle.id),
      p(brkActr.id, "R_BrakeCmd", "required", ifBrake.id),
    ])
    .returning({ id: ports.id, name: ports.name });

  // ── Runnables ─────────────────────────────────────────────
  await db.insert(runnables).values([
    { componentId: spdSnsr.id, name: "VehicleSpdSnsr_Init", eventType: "init" },
    { componentId: spdSnsr.id, name: "VehicleSpdSnsr_Run", eventType: "timing", periodMs: 10 },
    { componentId: radar.id, name: "FrntRadarCtrl_Init", eventType: "init" },
    { componentId: radar.id, name: "FrntRadarCtrl_Run", eventType: "timing", periodMs: 20 },
    { componentId: accCtrl.id, name: "AccCtrl_Init", eventType: "init" },
    { componentId: accCtrl.id, name: "AccCtrl_Main", eventType: "timing", periodMs: 20 },
    {
      componentId: accCtrl.id,
      name: "AccCtrl_ModeRequest",
      eventType: "operation-invoked",
      operationPort: "P_AccMode",
    },
    { componentId: hmi.id, name: "HmiModeMgr_Init", eventType: "init" },
    { componentId: hmi.id, name: "HmiModeMgr_Run", eventType: "timing", periodMs: 50 },
    { componentId: thrActr.id, name: "ThrottleActr_Run", eventType: "timing", periodMs: 10 },
    { componentId: brkActr.id, name: "BrakeActr_Run", eventType: "timing", periodMs: 10 },
  ]);

  // ── Connections (Assembly Connectors) ─────────────────────
  const byName = new Map(insertedPorts.map((x) => [x.name, x.id]));
  const link = (src: string, tgt: string) => ({
    projectId: pid,
    sourcePortId: byName.get(src)!,
    targetPortId: byName.get(tgt)!,
  });
  await db.insert(connections).values([
    link("P_VehicleSpeed", "R_VehicleSpeed"),
    link("P_TargetObj", "R_TargetObj"),
    link("P_ThrottleCmd", "R_ThrottleCmd"),
    link("P_BrakeCmd", "R_BrakeCmd"),
    link("P_AccMode", "R_AccMode"),
  ]);

  void dt;
  return pid;
}
