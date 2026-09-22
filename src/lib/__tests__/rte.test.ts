import { describe, expect, it } from "vitest";
import { generateRteFiles } from "@/lib/rte";
import { buildFixture } from "./fixtures";

describe("generateRteFiles", () => {
  const files = generateRteFiles(buildFixture());
  const byPath = (p: string) => files.find((f) => f.path === p);

  it("Rte_Type.h에 프리미티브/배열/구조체 typedef가 생성된다", () => {
    const h = byPath("Rte_Type.h");
    expect(h).toBeDefined();
    const content = h!.content;

    expect(content).toContain("typedef uint16 Speed_T;");
    expect(content).toContain("typedef uint16 SpeedArr_T[8]; /* array of Speed_T */");
    expect(content).toContain("typedef struct {");
    expect(content).toContain("  uint16 speed;");
    expect(content).toContain("  boolean valid;");
    expect(content).toContain("} SpeedRec_T;");
  });

  it("Snsr 헤더에 러너블 extern과 Rte_Write가 생성된다", () => {
    const h = byPath("Rte_Snsr.h");
    expect(h).toBeDefined();
    const content = h!.content;

    expect(content).toContain("extern void Snsr_Init(void);");
    expect(content).toContain("extern void Snsr_Run(void);");
    expect(content).toContain("Rte_Write_Snsr_P_Speed_vehicleSpeed");
  });

  it("Ctrl 헤더에 Rte_Read(비큐)와 Rte_Receive(큐)가 생성된다", () => {
    const h = byPath("Rte_Ctrl.h");
    expect(h).toBeDefined();
    const content = h!.content;

    expect(content).toContain("Rte_Read_Ctrl_R_Speed_vehicleSpeed");
    expect(content).toContain("Rte_Receive_Ctrl_R_Queue_vehicleSpeed");
  });

  it("Ctrl의 provided C/S 포트(P_Mode)는 서버 심볼 Ctrl_SetMode이며 Rte_Call_은 생성되지 않는다", () => {
    const h = byPath("Rte_Ctrl.h");
    expect(h).toBeDefined();
    const content = h!.content;

    expect(content).toContain("extern Std_ReturnType Ctrl_SetMode(uint16 mode);");
    expect(content).not.toContain("Rte_Call_Ctrl_P_Mode_SetMode");
  });
});