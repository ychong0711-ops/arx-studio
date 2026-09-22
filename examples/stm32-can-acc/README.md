# STM32/CAN ACC Closed-Loop Demo (host-runnable)

A self-contained C example that exercises **the same RTE contract API the
ARX Studio generator emits** (`src/lib/rte.ts`) for AUTOSAR Classic SW-Cs —
`Rte_Read_<SWC>_<Port>_<DataElement>` / `Rte_Write_<SWC>_<Port>_<DataElement>`
and runnable signatures `void <SWC>_<Mode>(void)` — on a **CAN closed loop**,
compiled and run entirely on the host (gcc, no board required).

The component wiring mirrors the ACC seed model in `src/lib/seed.ts`:

| SW-C (seed)          | Port         | Direction | Interface        | Data elements             | Runnable (seed period) |
|----------------------|--------------|-----------|------------------|---------------------------|-------------------------|
| VehicleSpdSnsr       | P_VehicleSpeed| provided | VehicleSpeed_If  | vehicleSpeed, speedValid  | VehicleSpdSnsr_Run (10 ms) |
| AccCtrl              | R_VehicleSpeed| required | VehicleSpeed_If  | vehicleSpeed, speedValid  | AccCtrl_Init, AccCtrl_Main (20 ms) |
| AccCtrl              | P_ThrottleCmd | provided | ThrottleCmd_If  | throttleReq               | (write)                 |
| AccCtrl              | P_BrakeCmd    | provided | BrakeCmd_If     | brakeReq                  | (write)                 |
| ThrottleActr         | R_ThrottleCmd | required | ThrottleCmd_If  | throttleReq               | ThrottleActr_Run (10 ms) |

> For the host demo every runnable is scheduled on a single 20 ms tick;
> the seed models 10 ms and 20 ms periods separately.

## Concept: contract-phase RTE API on a CAN closed loop

The generator emits *contract-phase* headers: the SW-C is written against
the RTE API and knows nothing about the transport. This demo writes the
SW-C exactly that way, then supplies a hand-written `rte_impl.c` behind the
contract and a host CAN mock so the whole loop can run on a PC.

```
Simulated vehicle plant (sensor_sim.c)
   │  Sim_GetSpeed(): ramp 0 → 50 km/h (+1 km/h per 40 ms), then held
   ▼
CAN frame 0x180: speed (LE16) + validity    [can_hal_mock.c Can_Receive]
   ▼
RteImpl_PollCanInput()  ── decodes the frame into the RTE read buffer
   ▼
AccCtrl_Main  (20 ms TimingEvent runnable)
   │  Rte_Read_AccCtrl_R_VehicleSpeed_vehicleSpeed / ..._speedValid
   │  PI-ish speed control (setpoint 40 km/h)
   │  Rte_Write_AccCtrl_P_ThrottleCmd_throttleReq / ..._P_BrakeCmd_brakeReq
   ▼
CAN frame 0x1A0: ACC status (thr | brk | speed | valid)   [Can_Transmit]
   ▼
ThrottleActr_Run  ── Rte_Read_ThrottleActr_R_ThrottleCmd_throttleReq
                     reports the applied throttle whenever it changes
```

## Files

| File | Role |
|------|------|
| `Platform_Types.h` / `Std_Types.h` | Host subset of the AUTOSAR base headers (stdint-based `uint8`…`float64`, `boolean`, `Std_ReturnType`, `E_OK`/`E_NOT_OK`). |
| `rte_contract.h` | Fixed, hand-written copy of the generator-style contract header (application typedefs + RTE access points + runnable externs). The naming rules come from `src/lib/rte.ts`. |
| `can_hal.h` | CAN abstraction (`CanMessage`, `CanStatus`, `Can_Init`/`Can_Transmit`/`Can_Receive`). |
| `can_hal_mock.c` | Host mock: RX synthesizes the 0x180 speed frame from the plant model; TX prints the frame to the console. |
| `can_hal_stm32_hal.c.template` | STM32Cube HAL porting skeleton (`HAL_CAN_AddTxMessage`, `HAL_CAN_GetRxMessage`, filter setup). Not compiled — excluded by its file-name extension. |
| `sensor_sim.c` / `sensor_sim.h` | Host-side vehicle plant: `Sim_Tick()`, `Sim_GetSpeed()`, `Sim_GetSpeedValid()`. Replaced by real speed acquisition on the target. |
| `rte_impl.c` / `rte_impl.h` | Hand-written stand-in for the generated RTE: read buffers fed by CAN RX, write access points that store and log. |
| `acc_app.c` | `AccCtrl_Init` (state reset + `Can_Init()`) and `AccCtrl_Main` (read → PI-ish control → write → transmit 0x1A0). |
| `throttle_actr.c` | `ThrottleActr_Run`: consumes the throttle command through the RTE read API. |
| `main.c` | Host scheduler: 20 ms tick loop (`usleep(20000)` on POSIX, `Sleep(20)` on Windows), exits after 160 cycles. |
| `Makefile` | `make` / `make run` / `make clean`. Compiles only the `.c` sources listed in `SRCS`. |

## CAN protocol (as simulated)

- **0x180 — speed frame, DLC 3:** `data[0..1]` vehicle speed, little-endian
  [km/h]; `data[2]` validity (0/1).
- **0x1A0 — ACC status frame, DLC 5:** `data[0]` throttle [%],
  `data[1]` brake [%], `data[2..3]` current speed LE16, `data[4]` validity.

Classic CAN, Standard (11-bit) identifiers.

## Build and run

Requires `gcc` and `make` (MSYS2/MinGW, Cygwin, or Linux/WSL).

```
make run
```

This is equivalent to:
`gcc -std=c99 -Wall -Wextra -Werror *.c -o acc_demo && ./acc_demo`
(using the explicit `SRCS` list in the Makefile; the `.template` file is
never compiled). Example output, first cycles:

```
[CAN] mock link up (synthetic speed sensor publishes 0x180)
  [RTE] Rte_Write_AccCtrl_P_ThrottleCmd_throttleReq(80%)
  [RTE] Rte_Write_AccCtrl_P_BrakeCmd_brakeReq(0%)
[CAN] TX id=0x1A0 dlc=5 data=50 00 00 00 01
[ACC] t=   20 ms  spd=  0 km/h  valid=1  thr= 80%  brk=  0%
[THR] apply throttle 80%
  [RTE] Rte_Write_AccCtrl_P_ThrottleCmd_throttleReq(78%)
  [RTE] Rte_Write_AccCtrl_P_BrakeCmd_brakeReq(0%)
[CAN] TX id=0x1A0 dlc=5 data=4E 00 01 00 01
[ACC] t=   40 ms  spd=  1 km/h  valid=1  thr= 78%  brk=  0%
```

and, once the plant passes the 40 km/h setpoint:

```
  [RTE] Rte_Write_AccCtrl_P_ThrottleCmd_throttleReq(0%)
  [RTE] Rte_Write_AccCtrl_P_BrakeCmd_brakeReq(20%)
[CAN] TX id=0x1A0 dlc=5 data=00 14 32 00 01
[ACC] t= 2000 ms  spd= 50 km/h  valid=1  thr=  0%  brk= 20%
[THR] apply throttle 0%
```

## Timeline (one cycle = 20 ms)

| Simulated time | Speed | Controller behavior |
|----------------|-------|---------------------|
| 0 ms           | —     | `AccCtrl_Init()` runs (INIT-EVENT): state reset + `Can_Init()`. |
| 20 ms          | 0     | Sensor self-check: `speedValid` FALSE → ACC holds throttle/brake at 0. |
| 20–1600 ms     | 0→40  | Ramp: `throttle` follows the falling PI error (≈80 % down to 0 %). |
| 1600 ms        | 40    | At the 40 km/h setpoint: throttle 0, brake 0 (cruise). |
| 1640–2000 ms   | 40→50 | The synthetic plant keeps ramping to 50 km/h regardless of the controller output (copied plant behavior); the ACC reacts by braking (≈2 %/km/h above the setpoint, 20 % at 50 km/h). This intentionally exercises both write paths. |
| 3200 ms        | 50    | Demo ends after 160 cycles; summary line printed. |

## Porting to STM32

1. Copy `can_hal_stm32_hal.c.template` → `can_hal_stm32_hal.c` inside the
   STM32 project and remove `can_hal_mock.c` from the build.
2. CubeMX: enable **CAN1** (Master/Normal, 500 kbit/s) on the board pins,
   generate code (defines `hcan1` in `main.c`). The filter skeleton in the
   template accepts the 0x180 speed frame on RX FIFO0.
3. Replace `sensor_sim.c` with real speed acquisition (wheel-speed sensor,
   ABS CAN message, or an ECU-internal speed signal). `rte_impl.c` is kept:
   `RteImpl_PollCanInput()` already decodes whatever frame the driver
   delivers, so the SW-C code in `acc_app.c` / `throttle_actr.c` needs no
   changes.
4. Scheduler: call `AccCtrl_Init()` once at startup, then
   `AccCtrl_Main()` and `ThrottleActr_Run()` every 20 ms from the OS task.
   `main.c` is only the host stand-in for that scheduler.
5. Transmit-only status frame note: nothing on the bus currently consumes
   0x1A0; it is present as a diagnostics/telemetry frame. Add a second
   filter bank if another ECU must receive it.

Wiring sketch (text, standard CAN bus):

```
 [Speed sensor node]                     [ACC ECU (STM32)]
   plant ──▶ CAN 0x180 ────┐              ┌── CAN_RX (FIFO0, filter 0x180)
                            └─ CANH/CANL ─┤
   (host: can_hal_mock)      twisted pair └── CAN_TX (0x1A0 status frame)
    120 Ω terminator                   120 Ω terminator
    (both ends)                         (both ends)
```

## Facts and notes

- Compiles clean under `-std=c99 -Wall -Wextra -Werror`; verified with
  gcc (MinGW-w64) and GNU Make.
- The RTE access points are hand-written but follow the generator naming
  (`src/lib/rte.ts`) exactly; in a generated project they live in
  `Rte_AccCtrl.h` / `Rte_ThrottleActr.h`, with types in `Rte_Type.h`.
- `Std_ReturnType` / `E_OK` / `E_NOT_OK` match the AUTOSAR `Std_Types.h`
  semantics used by the generator output.
- The vehicle plant is deliberately a fixed ramp (0 → 50 km/h) so the ACC
  controller sees a repeatable input; it is not a vehicle dynamics model.