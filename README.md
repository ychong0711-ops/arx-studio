# ARX Studio — AUTOSAR Classic Authoring & Code Generation Tool

**Contract-phase modeling for AUTOSAR Classic software components: SW-C, port-prototypes, S/R & C/S interfaces, runnables and assembly connectors — with schema-verified ARXML export and generated RTE contract code (C).**

ARX Studio is a web-based, database-backed authoring workspace for the
architecture/contract phase of AUTOSAR (Classic Platform) ECU software
development. You model the virtual functional bus at the software-component
level, get live conformance checks, and export:

- **ARXML** — importable into standard tool chains (DaVinci, ISOLAR, AUTOSAR
  Builder, …), validated against the official AUTOSAR XSD schema.
- **RTE contract code (C)** — `Std_Types.h`, `Platform_Types.h`, per-SW-C
  contract headers (`Rte_Read_*` / `Rte_Write_*` / `Rte_Call_*`) and runnable
  skeletons — verifiably compilable (CI + local `npm run build:rte`).

---

## Screenshots

**Project dashboard** (ACC demo project)

![Dashboard](docs/screenshots/dashboard.png)

**Assembly topology** — drag SW-Cs, link P-Port ↔ R-Port on a React Flow canvas

![Topology](docs/screenshots/topology.png)

**Export tab** — schema-verified ARXML and RTE contract code (C)

![Export](docs/screenshots/export.png)

---

## Features

- **SW-C modeling** — 8 AUTOSAR categories (application, sensor-actuator,
  composition, service, NV-block, parameter, ECU abstraction, complex device
  driver) with ports, runnables and events (init / timing / operation-invoked).
- **Port interfaces** — Sender-Receiver (queued/non-queued) and Client-Server
  with typed arguments.
- **Data types** — application primitive, **array** and **record (structure)**
  types with base types, limits, units.
- **Assembly topology** — React Flow canvas: drag SW-Cs, link P-Port ↔ R-Port,
  auto-layout, auto-generated `ASSEMBLY-SW-CONNECTOR`s (only valid pairs are
  emitted; invalid ones surface as validation errors).
- **Validation engine** — SHORT-NAME rules, duplicate detection, undefined type
  references, port direction/interface-kind consistency, runnable-event
  correctness. Errors block a clean export; warnings are explained.
- **ARXML import** — paste existing ARXML; SW-Cs, ports, runnables, SR/CS
  interfaces, primitive/array/record data types, assembly connectors and
  compositions are parsed back into an editable project (round-trip).
- **Schema-aware export** — R20-11 … R24-11 with the correct XSD reference and
  namespace (`http://autosar.org/schema/r4.0`).
- **RTE contract generation** — portable C headers/skeletons that compile
  clean with `-Wall -Wextra -Werror` (host proof, see Examples).
- **Demo project** — a realistic Adaptive Cruise Control (ACC) model is seeded
  on first run.

---

## AUTOSAR conformance

The ARXML generator output is checked against the **official AUTOSAR XSD
schemas** (AUTOSAR_00049 … AUTOSAR_00053 per release). Concretely verified:

- Correct release→XSD mapping (`R23-11` → `AUTOSAR_00052.xsd`, …).
- `IMPLEMENTATION-DATA-TYPE` contains no `TYPE-TREF` (schema-invalid children
  removed).
- Array/record application types use the standard
  `APPLICATION-ARRAY-DATA-TYPE` (`ELEMENT`, `MAX-NUMBER-OF-ELEMENTS`) and
  `APPLICATION-RECORD-DATA-TYPE` (`ELEMENTS` → `APPLICATION-RECORD-ELEMENT`)
  structures; implementation side uses `SUB-ELEMENTS`.
- `SW-BASE-TYPE` encoding conventions (`2C`, `IEEE754`, `BOOLEAN`, `NONE`) and
  `NATIVE-DECLARATION`.
- Removed/obsolete elements (`DATA-UPDATE-PERIOD` in `NONQUEUED-SENDER-COM-SPEC`)
  are not emitted.

This is continuously enforced by the unit test suite (see below).

---

## Tech stack

| Layer       | Technology                                            |
|-------------|-------------------------------------------------------|
| Frontend    | Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion, React Flow (@xyflow/react), lucide icons |
| Backend     | Next.js Server Actions, Drizzle ORM, PostgreSQL (`pg`) |
| Types       | TypeScript (strict)                                  |
| Testing     | Vitest 5 + `@xmldom/xmldom` (27 tests)                |
| CI          | GitHub Actions (lint, typecheck, tests, C build)      |

---

## Architecture

```mermaid
flowchart LR
  UI[React UI<br/>Dashboard / Workspace / Topology] --> SA[Server Actions<br/>src/lib/actions.ts]
  SA --> DB[(PostgreSQL<br/>Drizzle schema)]
  SA --> GEN[RTE contract C<br/>src/lib/rte.ts]
  SA --> ARX[ARXML generator<br/>src/lib/arxml.ts]
  ARX --> VAL[Validation<br/>src/lib/validation.ts]
  IMP[ARXML import<br/>src/lib/importer.ts] --> DB
  ARX --> OUT[.arxml export<br/>REST + download]
  GEN --> OUT2[Rte_Type.h / Std_Types.h /<br/>Rte_<SWC>.h / <SWC>.c]
  OUT2 --> C[gcc/clang host build<br/>examples/host-rte]
```

The generator/validator/import are **pure functions** (no DB, no network) and
are unit-tested in isolation.

---

## Quick start

Requirements: Node.js ≥ 20, PostgreSQL (local or remote).

```bash
npm install

# Point the app at your database
# PowerShell:
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/app_db"
# bash:
# export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"

npx drizzle-kit push       # apply schema (migration SQL in ./drizzle)
npm run dev                # http://localhost:3000
```

On first run a demo **ACC** project (radar cruise control) is seeded
automatically.

### Verification

```bash
npm test                   # 27 unit tests (arxml / rte / validation)
npm run typecheck          # tsc --noEmit
npm run lint               # eslint .
npm run build:rte          # generate ACC RTE contract C and compile it (host)
```

---

## Repository layout

```
src/
  app/               Next.js pages + API export route
  components/        dashboard, workspace tabs, topology, UI kit
  db/                Drizzle schema + pool
  lib/
    arxml.ts         ARXML generator (schema-verified)
    rte.ts           RTE contract code generator
    validation.ts    AUTOSAR conformance checks
    importer.ts      ARXML → model importer
    actions.ts       server actions (CRUD, import, export, duplicate)
    seed.ts          ACC demo seed (DB)
    demo/            DB-free ACC fixture used by the C build harness
    __tests__/       vitest fixtures + tests
scripts/rte-demo.ts  C build harness (tsx)
examples/
  host-rte/          generated ACC RTE contract + host C build
  stm32-can-acc/     CAN closed-loop demo using the generated RTE API
drizzle/             SQL migrations
.github/workflows/   CI
```

---

## Examples

### 1. Compiled RTE contract (`npm run build:rte`)

Generates the RTE contract for the ACC demo and compiles it with a host C
compiler (`gcc`/`clang`, `-std=c99 -Wall -Wextra -Werror`):

```
Rte_Type.h            Std_Types.h      Platform_Types.h
Rte_VehicleSpdSnsr.h  VehicleSpdSnsr.c Rte_AccCtrl.h / AccCtrl.c
Rte_ThrottleActr.h    ThrottleActr.c   ... (6 SW-Cs)
rte_demo_main.c  →  rte_demo (binary)
```

### 2. STM32 / CAN closed-loop demo (`examples/stm32-can-acc/`)

A host-runnable demonstration that uses the generated RTE API the way an
embedded application would: sensor simulation → CAN RX → `Rte_Read_*` →
`AccCtrl_Main` (PI-style control) → `Rte_Write_*` → CAN TX. Ships with a CAN
mock for the host build and an STM32Cube HAL porting template.

```bash
cd examples/stm32-can-acc && make run
```

---

## Notes & limitations

- This is a **contract-phase authoring tool**, not an ECU-configuration tool
  (no BSW stack, no ECU extract, no scheduling/OS configuration).
- `RootComposition` is generated by the export and skipped on import to keep
  round-trips clean.
- RTE files are contracts/skeletons; the actual RTE implementation is provided
  by your target AUTOSAR stack.
- Not affiliated with the AUTOSAR consortium; AUTOSAR is a registered trademark
  of the AUTOSAR development cooperation.