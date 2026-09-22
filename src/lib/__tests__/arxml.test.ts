import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { generateArxml } from "@/lib/arxml";
import { buildFixture } from "./fixtures";

/** XML 문자열을 파싱하고 well-formed인지(parsererror 없음) 검증 후 Document를 반환한다. */
function parseXml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  expect(doc.getElementsByTagName("parsererror").length).toBe(0);
  return doc;
}

describe("generateArxml", () => {
  const xml = generateArxml(buildFixture());
  const doc = parseXml(xml);

  it("well-formed XML을 생성한다 (parsererror 없음)", () => {
    expect(doc.documentElement?.tagName).toBe("AUTOSAR");
  });

  it("R23-11: 루트 xmlns=r4.0, schemaLocation에 AUTOSAR_00052.xsd", () => {
    expect(xml).toContain('xmlns="http://autosar.org/schema/r4.0"');
    expect(xml).toContain("http://autosar.org/schema/r4.0 AUTOSAR_00052.xsd");
  });

  it("autosarVersion R24-11 프로젝트는 AUTOSAR_00053.xsd를 사용한다", () => {
    const fix = buildFixture();
    fix.project.autosarVersion = "R24-11";
    const r24 = generateArxml(fix);
    expect(r24).toContain("http://autosar.org/schema/r4.0 AUTOSAR_00053.xsd");
  });

  it("모든 IMPLEMENTATION-DATA-TYPE에 TYPE-TREF가 없다", () => {
    const impls = doc.getElementsByTagName("IMPLEMENTATION-DATA-TYPE");
    expect(impls.length).toBeGreaterThan(0);
    for (let i = 0; i < impls.length; i++) {
      expect(impls[i].getElementsByTagName("TYPE-TREF").length).toBe(0);
    }
  });

  it("NONQUEUED-SENDER-COM-SPEC에 DATA-UPDATE-PERIOD 자식이 없다", () => {
    const specs = doc.getElementsByTagName("NONQUEUED-SENDER-COM-SPEC");
    expect(specs.length).toBeGreaterThan(0);
    for (let i = 0; i < specs.length; i++) {
      expect(specs[i].getElementsByTagName("DATA-UPDATE-PERIOD").length).toBe(0);
    }
  });

  it("모든 SW-BASE-TYPE에 NATIVE-DECLARATION이 존재한다", () => {
    const baseTypes = doc.getElementsByTagName("SW-BASE-TYPE");
    expect(baseTypes.length).toBeGreaterThan(0);
    for (let i = 0; i < baseTypes.length; i++) {
      expect(baseTypes[i].getElementsByTagName("NATIVE-DECLARATION").length).toBe(1);
    }
  });

  it("ARRAY 데이터타입: APPLICATION-ARRAY-DATA-TYPE + ELEMENT + MAX-NUMBER-OF-ELEMENTS 8", () => {
    const arrays = doc.getElementsByTagName("APPLICATION-ARRAY-DATA-TYPE");
    expect(arrays.length).toBe(1);
    const elements = arrays[0].getElementsByTagName("ELEMENT");
    expect(elements.length).toBe(1);
    expect(elements[0].getElementsByTagName("MAX-NUMBER-OF-ELEMENTS")[0]?.textContent).toBe("8");
  });

  it("STRUCTURE 데이터타입: APPLICATION-RECORD-ELEMENT 2개", () => {
    const records = doc.getElementsByTagName("APPLICATION-RECORD-DATA-TYPE");
    expect(records.length).toBe(1);
    expect(records[0].getElementsByTagName("APPLICATION-RECORD-ELEMENT").length).toBe(2);
  });

  it("SENDER-RECEIVER-INTERFACE에 VARIABLE-DATA-PROTOTYPE 2개", () => {
    const srs = doc.getElementsByTagName("SENDER-RECEIVER-INTERFACE");
    expect(srs.length).toBe(1);
    expect(srs[0].getElementsByTagName("VARIABLE-DATA-PROTOTYPE").length).toBe(2);
  });

  it("CLIENT-SERVER-INTERFACE에 CLIENT-SERVER-OPERATION + ARGUMENT-DATA-PROTOTYPE", () => {
    const css = doc.getElementsByTagName("CLIENT-SERVER-INTERFACE");
    expect(css.length).toBe(1);
    expect(css[0].getElementsByTagName("CLIENT-SERVER-OPERATION").length).toBe(1);
    expect(css[0].getElementsByTagName("ARGUMENT-DATA-PROTOTYPE").length).toBe(1);
  });

  it("유효 연결만 ASSEMBLY-SW-CONNECTOR로 생성되고 같은 방향 무효 연결은 제외된다", () => {
    expect(doc.getElementsByTagName("ASSEMBLY-SW-CONNECTOR").length).toBe(1);
  });

  it("OPERATION-INVOKED-EVENT는 Ctrl_OpInv(P_Mode C/S)만 1개, Brk_Bad는 주석 처리된다", () => {
    expect(doc.getElementsByTagName("OPERATION-INVOKED-EVENT").length).toBe(1);
    expect(xml).toContain("OPERATION-INVOKED-EVENT 생략됨");
    expect(xml).toContain("NoSuchPort");
  });

  it("특수문자(&, <)는 XML 엔티티로 이스케이프된다", () => {
    // generateArxml은 project.description을 ARXML에 출력하지 않으므로,
    // 실제로 esc()가 적용되는 출력 경로(SWC SHORT-NAME)로 이스케이프를 검증한다.
    const fix = buildFixture();
    const ctrl = fix.components.find((c) => c.name === "Ctrl");
    expect(ctrl).toBeDefined();
    ctrl!.name = "C&trol <v1>";
    expect(xml).not.toContain("Test & Demo <project>"); // description은 산출물에 미출력

    const escXml = generateArxml(fix);
    expect(escXml).toContain("C&amp;trol &lt;v1&gt;");
    expect(escXml).not.toContain("<SHORT-NAME>C&trol");
    parseXml(escXml); // 이스케이프 후에도 well-formed
  });
});