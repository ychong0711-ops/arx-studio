/** 도메인 검증 SWC 템플릿 — 원클릭 추가 */
export interface SwcTemplate {
  name: string;
  category: string;
  description: string;
  domain: string;
  ports: {
    name: string;
    direction: "provided" | "required";
    ifaceHint: string | null; // 기존 인터페이스 이름과 매칭 시도
  }[];
  runnables: { name: string; eventType: string; periodMs: number }[];
}

export const SWC_TEMPLATES: SwcTemplate[] = [
  {
    name: "RadarSnsr",
    category: "sensoractuator",
    description: "77GHz 전방 레이더 타겟 리스트 처리",
    domain: "ADAS",
    ports: [
      { name: "P_TargetObj", direction: "provided", ifaceHint: "TargetObj_If" },
    ],
    runnables: [
      { name: "RadarSnsr_Init", eventType: "init", periodMs: 0 },
      { name: "RadarSnsr_Run", eventType: "timing", periodMs: 20 },
    ],
  },
  {
    name: "CameraSnsr",
    category: "sensoractuator",
    description: "전방 칩 머신비전 차선/객체 인식",
    domain: "ADAS",
    ports: [
      { name: "P_LaneInfo", direction: "provided", ifaceHint: null },
    ],
    runnables: [
      { name: "CameraSnsr_Init", eventType: "init", periodMs: 0 },
      { name: "CameraSnsr_Run", eventType: "timing", periodMs: 40 },
    ],
  },
  {
    name: "UltrasonicSnsr",
    category: "sensoractuator",
    description: "초음파 센서 링(8ch) 근거리 장애물 측정",
    domain: "Parking",
    ports: [
      { name: "P_DistanceInfo", direction: "provided", ifaceHint: null },
    ],
    runnables: [
      { name: "UltrasonicSnsr_Init", eventType: "init", periodMs: 0 },
      { name: "UltrasonicSnsr_Run", eventType: "timing", periodMs: 60 },
    ],
  },
  {
    name: "EscBrakeCtrl",
    category: "application",
    description: "ESC 제동 토크 분배 및 휠 슬립 제어",
    domain: "Chassis",
    ports: [
      { name: "R_BrakeCmd", direction: "required", ifaceHint: "BrakeCmd_If" },
      { name: "P_WheelTorque", direction: "provided", ifaceHint: null },
    ],
    runnables: [
      { name: "EscBrakeCtrl_Init", eventType: "init", periodMs: 0 },
      { name: "EscBrakeCtrl_Run", eventType: "timing", periodMs: 5 },
    ],
  },
  {
    name: "EpsSteerCtrl",
    category: "application",
    description: "전동식 파워스티어링 모터 토크 제어",
    domain: "Chassis",
    ports: [
      { name: "R_SteerAngle", direction: "required", ifaceHint: null },
      { name: "P_MotorTorque", direction: "provided", ifaceHint: null },
    ],
    runnables: [
      { name: "EpsSteerCtrl_Init", eventType: "init", periodMs: 0 },
      { name: "EpsSteerCtrl_Run", eventType: "timing", periodMs: 5 },
    ],
  },
  {
    name: "BcmLightCtrl",
    category: "application",
    description: "전조등/제동등/방향지시등 드라이브 제어",
    domain: "Body",
    ports: [
      { name: "R_LightRequest", direction: "required", ifaceHint: null },
      { name: "P_LightDrive", direction: "provided", ifaceHint: null },
    ],
    runnables: [
      { name: "BcmLightCtrl_Init", eventType: "init", periodMs: 0 },
      { name: "BcmLightCtrl_Run", eventType: "timing", periodMs: 50 },
    ],
  },
  {
    name: "HvacCtrl",
    category: "application",
    description: "공조 블로워/댐퍼 자동 온도 제어",
    domain: "Body",
    ports: [
      { name: "R_TempSetting", direction: "required", ifaceHint: null },
      { name: "P_BlowerCmd", direction: "provided", ifaceHint: null },
    ],
    runnables: [
      { name: "HvacCtrl_Init", eventType: "init", periodMs: 0 },
      { name: "HvacCtrl_Run", eventType: "timing", periodMs: 100 },
    ],
  },
  {
    name: "BatteryMgr",
    category: "application",
    description: "HV 배터리 SOC/SOH 추정 및 충방전 제한",
    domain: "EV",
    ports: [
      { name: "R_PackCurrent", direction: "required", ifaceHint: null },
      { name: "P_PackStatus", direction: "provided", ifaceHint: null },
    ],
    runnables: [
      { name: "BatteryMgr_Init", eventType: "init", periodMs: 0 },
      { name: "BatteryMgr_Run", eventType: "timing", periodMs: 100 },
    ],
  },
];
