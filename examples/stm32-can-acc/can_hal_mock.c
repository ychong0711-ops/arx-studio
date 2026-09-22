/*
 * can_hal_mock.c
 * Host (gcc) implementation of the CAN HAL used by the demo.
 *
 *  - Can_Receive: synthesizes the speed-sensor frame (ID 0x180) from the
 *                 sensor_sim plant:  speed ramp 0 -> 50 km/h.
 *  - Can_Transmit: prints the frame exactly as a bus monitor would.
 *
 * Replace this file with can_hal_stm32_hal.c when porting to STM32.
 */

#include <stdio.h>

#include "can_hal.h"
#include "sensor_sim.h"

#define MOCK_SPEED_FRAME_DLC 3u /* speed (LE16) + validity                 */

CanStatus Can_Init(void)
{
    printf("[CAN] mock link up (synthetic speed sensor publishes 0x180)\n");
    return CAN_OK;
}

CanStatus Can_Transmit(const CanMessage *msg)
{
    uint8 i;

    if (msg == (const CanMessage *)0) {
        return CAN_ERROR;
    }
    printf("[CAN] TX id=0x%03X dlc=%u data=",
           (unsigned)msg->id, (unsigned)msg->dlc);
    for (i = 0u; i < msg->dlc; i++) {
        printf("%02X ", (unsigned)msg->data[i]);
    }
    printf("\n");
    return CAN_OK;
}

CanStatus Can_Receive(CanMessage *msg)
{
    VehicleSpeed_T spd;

    if (msg == (CanMessage *)0) {
        return CAN_ERROR;
    }

    /* Synthesize one speed frame per poll (20 ms) from the plant model. */
    spd = Sim_GetSpeed();
    msg->id  = CAN_ID_SPEED_SENSOR;
    msg->dlc = MOCK_SPEED_FRAME_DLC;
    msg->data[0] = (uint8)(spd & 0xFFu);
    msg->data[1] = (uint8)((spd >> 8u) & 0xFFu);
    msg->data[2] = (uint8)((Sim_GetSpeedValid() != FALSE) ? 1u : 0u);
    msg->data[3] = 0u;
    msg->data[4] = 0u;
    msg->data[5] = 0u;
    msg->data[6] = 0u;
    msg->data[7] = 0u;
    return CAN_OK;
}