#ifndef RTE_IMPL_H
#define RTE_IMPL_H

/*
 * Host-side RTE shim helper (not part of the AUTOSAR API itself).
 * main.c calls this once per 20 ms cycle to pull the latest CAN frame
 * (speed sensor) into the RTE read buffer used by Rte_Read_...
 */

void RteImpl_PollCanInput(void);

#endif /* RTE_IMPL_H */