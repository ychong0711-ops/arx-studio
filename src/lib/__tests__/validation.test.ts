import { describe, expect, it } from "vitest";
import { validateProject } from "@/lib/validation";
import {
  buildFixture,
  validProject,
  withBadOperationPort,
  withDuplicateSwcName,
  withEmptyArrayElementType,
  withInterfaceMismatchConnection,
  withSameDirectionConnection,
  withUndefinedArrayElementType,
  withUndefinedSrType,
  withUndefinedStructureMember,
} from "./fixtures";
import type { FullProject } from "@/lib/types";

const errors = (fix: FullProject) =>
  validateProject(fix).filter((i) => i.level === "error");

describe("validateProject", () => {
  it("정상 픽스처(validProject)는 error가 0건이다", () => {
    expect(errors(validProject())).toHaveLength(0);
  });

  it("SWC 이름 중복 → error", () => {
    const errs = errors(withDuplicateSwcName());
    expect(errs.some((e) => e.message.includes("중복된 SWC 이름"))).toBe(true);
  });

  it("SR 요소가 정의되지 않은 DataType을 참조하면 → error", () => {
    const errs = errors(withUndefinedSrType());
    expect(
      errs.some((e) => e.message.includes("정의되지 않은 타입 'Speediff'")),
    ).toBe(true);
  });

  it("같은 방향(required↔required) 연결 → error", () => {
    const errs = errors(withSameDirectionConnection());
    expect(errs.some((e) => e.message.includes("P-Port ↔ R-Port"))).toBe(true);
  });

  it("인터페이스 종류 불일치(SR↔CS) 연결 → error", () => {
    const errs = errors(withInterfaceMismatchConnection());
    expect(errs.some((e) => e.message.includes("인터페이스 종류가 다릅니다"))).toBe(true);
  });

  it("operation-invoked 러너블이 존재하지 않는 포트를 참조하면 → error", () => {
    const errs = errors(withBadOperationPort());
    expect(errs.some((e) => e.message.includes("P-Port 목록에 없습니다"))).toBe(true);
  });

  it("ARRAY elementType이 빈 문자열이면 → error", () => {
    const errs = errors(withEmptyArrayElementType());
    expect(errs.some((e) => e.message.includes("배열 요소 타입이 지정되지 않았습니다"))).toBe(true);
  });

  it("ARRAY elementType이 미정의 타입이면 → error", () => {
    const errs = errors(withUndefinedArrayElementType());
    expect(errs.some((e) => e.message.includes("정의되지 않았습니다"))).toBe(true);
  });

  it("STRUCTURE 멤버 typeRef가 미정의면 → error", () => {
    const errs = errors(withUndefinedStructureMember());
    expect(
      errs.some((e) =>
        e.message.includes("구조체 멤버 'speed'이(가) 정의되지 않은 타입"),
      ),
    ).toBe(true);
  });

  it("베이스 픽스처(buildFixture)는 같은 방향 커넥터 오류를 포함한다", () => {
    const errs = errors(buildFixture());
    expect(errs.some((e) => e.message.includes("P-Port ↔ R-Port"))).toBe(true);
  });
});