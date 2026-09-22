/*
 * throttle_actr.c
 * ThrottleActr SW-C: consumes the ACC throttle command through the RTE read
 * access point (required port R_ThrottleCmd) and drives an actuator.
 * The actuator "moves" only when the commanded value changes, which keeps
 * the console output readable while still acting on every update.
 */

#include <stdio.h>

#include "rte_contract.h"

static Percent_T g_lastAppliedThrottle = 0xFFu; /* force the first print */

void ThrottleActr_Run(void)
{
    Percent_T thr = 0u;

    if (Rte_Read_ThrottleActr_R_ThrottleCmd_throttleReq(&thr) != E_OK) {
        printf("[THR] RTE read failed - actuator holds its position\n");
        return;
    }
    if (thr != g_lastAppliedThrottle) {
        printf("[THR] apply throttle %u%%\n", (unsigned)thr);
        g_lastAppliedThrottle = thr;
    }
}