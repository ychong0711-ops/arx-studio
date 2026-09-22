/**
 * Host-RTE 계약 빌드 데모 (build:rte)
 *
 * 1. buildAccDemo() (DB 없는 ACC 데모 모델) → generateRteFiles() 로 RTE 계약 코드 생성
 * 2. examples/host-rte/build/src/ 에 기록 (폴더 재생성)
 * 3. rte_demo_main.c 추가 후 호스트 C 컴파일러(gcc 기본)로 -std=c99 -Wall -Wextra -Werror 빌드
 * 4. (win32 제외) 생성 바이너리 실행 → 생성 파일 목록 + 크기 출력
 *
 * 경로 별칭(@) 없이 상대 import 만 사용한다.
 */
import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateRteFiles } from "../src/lib/rte";
import { buildAccDemo } from "../src/lib/demo/acc-demo";

const buildRoot = join(__dirname, "..", "examples", "host-rte", "build");
const buildSrc = join(buildRoot, "src");

// ── 1) 출력 폴더 재생성 ───────────────────────────────────────
rmSync(buildRoot, { recursive: true, force: true });
mkdirSync(buildSrc, { recursive: true });

// ── 2) RTE 계약 파일 기록 ────────────────────────────────────
const files = generateRteFiles(buildAccDemo());
for (const f of files) {
  writeFileSync(join(buildSrc, f.path), f.content, "utf8");
}

// ── 3) 호스트 메인(C) 기록 ───────────────────────────────────
const mainC = `/* Host-RTE contract build demo */
#include "Rte_Type.h"
#include "Rte_VehicleSpdSnsr.h"
#include "Rte_AccCtrl.h"
#include "Rte_ThrottleActr.h"
/* runnable entities */
void VehicleSpdSnsr_Init(void); void VehicleSpdSnsr_Run(void);
void AccCtrl_Init(void); void AccCtrl_Main(void); void AccCtrl_ModeRequest(void);
void ThrottleActr_Run(void);
int main(void) {
  VehicleSpdSnsr_Init(); VehicleSpdSnsr_Run();
  AccCtrl_Init(); AccCtrl_Main();
  ThrottleActr_Run();
  return 0;
}
`;
writeFileSync(join(buildSrc, "rte_demo_main.c"), mainC, "utf8");

// ── 4) 호스트 C 컴파일 ───────────────────────────────────────

/** 사용 가능한 C 컴파일러 선택 (CC 환경변수 > gcc > clang > cc) */
function pickCompiler(): string {
  const candidates = process.env.CC
    ? [process.env.CC]
    : ["gcc", "clang", "cc"];
  for (const c of candidates) {
    const r = spawnSync(c, ["--version"], { stdio: "ignore" });
    if (r.status === 0) return c;
  }
  console.error(
    "[build:rte] no C compiler found (tried: " + candidates.join(", ") + ")",
  );
  process.exit(1);
}

const cc = pickCompiler();
const exePath = join(buildRoot, "rte_demo");
// 셸 글로브에 의존하지 않고 Node에서 .c 파일을 직접 열거 (Windows cmd 대응)
const cSources = readdirSync(buildSrc)
  .filter((f) => f.endsWith(".c"))
  .map((f) => `"${join(buildSrc, f)}"`)
  .join(" ");
const cmd = `${cc} -std=c99 -Wall -Wextra -Werror -I "${buildSrc}" -o "${exePath}" ${cSources}`;

try {
  execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] });
} catch (err) {
  const e = err as { stdout?: Buffer | string; stderr?: Buffer | string };
  console.error(`[build:rte] C compile failed: ${cmd}`);
  if (e.stdout) console.error(String(e.stdout));
  if (e.stderr) console.error(String(e.stderr));
  process.exit(1);
}
console.log(`[build:rte] compiled OK: ${cmd}`);

// ── 5) (win32 제외) 생성 바이너리 실행 ────────────────────────
if (process.platform !== "win32") {
  execSync(exePath, { stdio: "inherit" });
  console.log(`[build:rte] ran ${exePath}`);
}

// ── 6) 생성 파일 목록 + 크기 출력 ─────────────────────────────
console.log("[build:rte] generated files:");
for (const name of readdirSync(buildSrc).sort()) {
  const p = join(buildSrc, name);
  console.log(`  ${name.padEnd(32)} ${statSync(p).size} bytes`);
}
try {
  const exeStat = statSync(exePath);
  const exeName = process.platform === "win32" ? "rte_demo.exe" : "rte_demo";
  console.log(`  ${exeName.padEnd(32)} ${exeStat.size} bytes (binary)`);
} catch {
  /* 바이너리가 없어도 계약 파일 목록은 출력한다 */
}