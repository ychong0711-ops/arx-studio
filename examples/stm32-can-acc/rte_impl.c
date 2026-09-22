/*
 * rte_impl.c
 * Hand-written RTE implementation behind the contract header rte_contract.h.
 *
 *  - Rte_Read_*  : return values stored in RTE buffers (fed by CAN RX).
 *  - Rte_Write_* : store the new value and log it to the console.
 *
 * In a generated project this file does not exist: the RTE (Napoleon vector
 * of the AUTOSAR stack) provides these symbols. Here it stands in for it so
 * the demo is self-contained on the host.
 */

#include <stdio.h>

#include "rte_contract.h"
#include "can_hal.h"
#include "rte_impl.h"

#define RTE_IMPL_SPEED_FRAME_DLC 3u /* speed (LE16) + validity             */

/* ---- RTE buffers ------------------------------------------------------- */
static VehicleSpeed_T g_vehicleSpeed = 0u;
static Boolean_T      g_speedValid   = FALSE;
static Percent_T      g_throttleCmd  = 0u;
static Percent_T      g_brakeCmd     = 0u;

/*
 * Decodes one CAN frame (0x180 speed sensor) into the RTE buffers.
 * Called by main.c once per 20 ms cycle, before AccCtrl_Main().
 */
void RteImpl_PollCanInput(void)
{
    CanMessage msg = {0u, 0u, {0u}};

    if (Can_Receive(&msg) != CAN_OK) {
        return; /* no frame this cycle: keep the previous value */
    }
    if (msg.id != CAN_ID_SPEED_SENSOR) {
        return; /* not the speed frame: ignore */
    }
    if (msg.dlc != RTE_IMPL_SPEED_FRAME_DLC) {
        g_speedValid = FALSE; /* malformed frame -> treat data as invalid */
        return;
    }
    g_vehicleSpeed = (VehicleSpeed_T)((uint16)msg.data[0] |
                                      ((uint16)msg.data[1] << 8u));
    g_speedValid   = (msg.data[2] != 0u) ? TRUE : FALSE;
}

/* ---- RTE read access points (required ports) --------------------------- */

Std_ReturnType Rte_Read_AccCtrl_R_VehicleSpeed_vehicleSpeed(
    VehicleSpeed_T *data)
{
    if (data == (VehicleSpeed_T *)0) {
        return E_NOT_OK;
    }
    *data = g_vehicleSpeed;
    return E_OK;
}

Std_ReturnType Rte_Read_AccCtrl_R_VehicleSpeed_speedValid(Boolean_T *data)
{
    if (data == (Boolean_T *)0) {
        return E_NOT_OK;
    }
    *data = g_speedValid;
    return E_OK;
}

Std_ReturnType Rte_Read_ThrottleActr_R_ThrottleCmd_throttleReq(
    Percent_T *data)
{
    if (data == (Percent_T *)0) {
        return E_NOT_OK;
    }
    *data = g_throttleCmd;
    return E_OK;
}

/* ---- RTE write access points (provided ports) -------------------------- */

Std_ReturnType Rte_Write_AccCtrl_P_ThrottleCmd_throttleReq(Percent_T data)
{
    g_throttleCmd = data;
    printf("  [RTE] Rte_Write_AccCtrl_P_ThrottleCmd_throttleReq(%u%%)\n",
           (unsigned)data);
    return E_OK;
}

Std_ReturnType Rte_Write_AccCtrl_P_BrakeCmd_brakeReq(Percent_T data)
{
    g_brakeCmd = data;
    printf("  [RTE] Rte_Write_AccCtrl_P_BrakeCmd_brakeReq(%u%%)\n",
           (unsigned)data);
    return E_OK;
}