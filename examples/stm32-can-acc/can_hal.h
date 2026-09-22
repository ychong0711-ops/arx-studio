#ifndef CAN_HAL_H
#define CAN_HAL_H

/*
 * CAN abstraction used by the ACC demo.
 * Host build  -> can_hal_mock.c
 * STM32 build -> can_hal_stm32_hal.c (skeleton provided as .template)
 */

#include "Platform_Types.h"

/* CAN identifiers used by the demo (Classic CAN, Standard 11-bit ID). */
#define CAN_ID_SPEED_SENSOR 0x180u /* speed sensor node -> ECU            */
#define CAN_ID_ACC_STATUS   0x1A0u /* ECU -> actuators / diagnostics      */

typedef struct {
    uint32 id;    /* Standard CAN identifier */
    uint8  dlc;   /* data length code (0..8) */
    uint8  data[8];
} CanMessage;

typedef enum {
    CAN_OK = 0,    /* operation completed                                */
    CAN_BUSY = 1,  /* controller busy / no message pending in RX FIFO    */
    CAN_ERROR = 2  /* hard error (invalid arguments, bus-off, TX abort)  */
} CanStatus;

/* Initializes the CAN controller and enables the node on the bus. */
CanStatus Can_Init(void);

/* Queues a message for transmission. Returns CAN_BUSY if no mailbox free. */
CanStatus Can_Transmit(const CanMessage *msg);

/* Polls one received frame into *msg. Returns CAN_BUSY when none pending. */
CanStatus Can_Receive(CanMessage *msg);

#endif /* CAN_HAL_H */