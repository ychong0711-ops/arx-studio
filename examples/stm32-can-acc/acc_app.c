/*
 * acc_app.c
 * AccCtrl SW-C implementation written against the RTE contract API only
 * (rte_contract.h). No knowledge of where the data comes from: Rte_Read_* /
 * Rte_Write_* hide the transport, exactly as in a generated AUTOSAR project.
 *
 * Control law: PI-ish speed controller (setpoint 40 km/h), implemented at
 * comment level on purpose:
 *   err   = setpoint - speed
 *   thr   = clamp(Kp*err + Ki*integral, 0, 100%)   when below setpoint
 *   brk   = clamp(Kp*|err|,           0, 100%)     when above setpoint
 * The synthetic plant ramps to 50 km/h regardless of the controller output,
 * which intentionally exercises BOTH write paths (throttle then brake).
 */

#include <stdio.h>

#include "rte_contract.h"
#include "can_hal.h"

#define ACC_TARGET_SPEED_KPH 40u /* cruise-control setpoint [km/h]        */
#define ACC_KP           2.0f    /* proportional gain                     */
#define ACC_KI           0.5f    /* integral gain                         */
#define ACC_INTEGRAL_MAX 20.0f   /* anti-windup cap on the integral term  */
#define ACC_TICK_MS      20u     /* TimingEvent period of AccCtrl_Main    */
#define ACC_STATUS_DLC   5u      /* status frame payload length (0x1A0)   */

static float  acc_speedIntegral = 0.0f; /* capped integral of the error   */
static uint32 acc_cycleCount    = 0u;   /* runnable invocation counter    */

static Percent_T acc_clampPercent(float value)
{
    if (value < 0.0f) {
        return 0u;
    }
    if (value > 100.0f) {
        return 100u;
    }
    return (Percent_T)value;
}

void AccCtrl_Init(void)
{
    /* Initialize internal state before the first periodic invocation. */
    acc_speedIntegral = 0.0f;
    acc_cycleCount    = 0u;

    /* Bring the CAN driver up once at startup. */
    (void)Can_Init();
}

void AccCtrl_Main(void)
{
    VehicleSpeed_T speed = 0u;
    Boolean_T      valid = FALSE;
    Percent_T      thr   = 0u;
    Percent_T      brk   = 0u;
    uint32         elapsedMs;
    CanMessage     status = {0u, 0u, {0u}};

    /* 1) Acquire the required data via the RTE read access points. */
    if (Rte_Read_AccCtrl_R_VehicleSpeed_vehicleSpeed(&speed) != E_OK) {
        speed = 0u;
    }
    if (Rte_Read_AccCtrl_R_VehicleSpeed_speedValid(&valid) != E_OK) {
        valid = FALSE;
    }

    /* 2) PI-ish speed control (comment-level implementation). */
    if (valid != FALSE) {
        float err = (float)ACC_TARGET_SPEED_KPH - (float)speed;
        if (err > 0.0f) {
            /* Below setpoint: drive the throttle, release the brake. */
            float p;
            acc_speedIntegral += err * ((float)ACC_TICK_MS / 1000.0f);
            if (acc_speedIntegral > ACC_INTEGRAL_MAX) {
                acc_speedIntegral = ACC_INTEGRAL_MAX;
            }
            p   = ACC_KP * err + ACC_KI * acc_speedIntegral;
            thr = acc_clampPercent(p);
            brk = 0u;
        } else {
            /* At/above setpoint: release the throttle, brake instead. */
            float p;
            acc_speedIntegral = 0.0f;
            p   = ACC_KP * (-err);
            brk = acc_clampPercent(p);
            thr = 0u;
        }
    } else {
        /* Safety: no valid speed measurement - hold both commands at 0. */
        acc_speedIntegral = 0.0f;
        thr = 0u;
        brk = 0u;
    }

    /* 3) Publish the commands through the RTE write access points. */
    (void)Rte_Write_AccCtrl_P_ThrottleCmd_throttleReq(thr);
    (void)Rte_Write_AccCtrl_P_BrakeCmd_brakeReq(brk);

    /* 4) Transmit the ACC status frame (0x1A0) over CAN.
     *    Payload: thr | brk | speed (LE16) | valid.                        */
    status.id   = CAN_ID_ACC_STATUS;
    status.dlc  = ACC_STATUS_DLC;
    status.data[0] = (uint8)thr;
    status.data[1] = (uint8)brk;
    status.data[2] = (uint8)(speed & 0xFFu);
    status.data[3] = (uint8)((speed >> 8u) & 0xFFu);
    status.data[4] = (uint8)((valid != FALSE) ? 1u : 0u);
    (void)Can_Transmit(&status);

    /* Console summary line (host demo only, no RTE involvement). */
    acc_cycleCount++;
    elapsedMs = acc_cycleCount * ACC_TICK_MS;
    printf("[ACC] t=%5u ms  spd=%3u km/h  valid=%u  thr=%3u%%  brk=%3u%%\n",
           (unsigned)elapsedMs,
           (unsigned)speed,
           (unsigned)valid,
           (unsigned)thr,
           (unsigned)brk);
}