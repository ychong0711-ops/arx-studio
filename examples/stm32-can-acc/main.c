/*
 * main.c
 * Host scheduler for the ACC demo: emulates the ECU OS tick.
 *
 * One cycle = 20 ms (TimingEvent of AccCtrl_Main), driven by usleep(20000)
 * on POSIX hosts. The same schedule applies on the STM32 target - the board
 * OS/scheduler would call AccCtrl_Main()/ThrottleActr_Run() from its own
 * 20 ms task instead of this while loop. The demo exits after a fixed
 * number of cycles so it is safe to run in a CI or console session.
 */

#include <stdio.h>

#include "rte_contract.h"
#include "rte_impl.h"
#include "sensor_sim.h"

/* 20 ms tick: usleep on POSIX, Sleep() on Windows (minimal shim). */
#if defined(_WIN32)
#include <windows.h>
#define DEMO_SLEEP_MS(ms) Sleep((DWORD)(ms))
#else
#include <unistd.h>
#define DEMO_SLEEP_MS(ms) usleep((unsigned int)((ms) * 1000u))
#endif

#define DEMO_TICK_MS  20u   /* one host cycle == one AccCtrl timing event */
#define DEMO_TOTAL_MS 3200u /* run length: 160 cycles (3.2 s simulated)  */

int main(void)
{
    uint32 cycles    = 0u;
    uint32 elapsedMs = 0u;

    printf("=== STM32/CAN ACC closed-loop demo (host build) ===\n");
    printf("RTE contract API: Rte_Read_/Rte_Write_ + runnables "
           "AccCtrl_Init, AccCtrl_Main, ThrottleActr_Run\n\n");

    /* MILESTONE 1: startup - run the INIT-EVENT runnable once.
     * AccCtrl_Init() resets controller state and boots the CAN driver.   */
    AccCtrl_Init();

    /* MILESTONE 2: periodic schedule, 20 ms tick. ----------------------- */
    while (1) {
        DEMO_SLEEP_MS(DEMO_TICK_MS); /* 20 ms timing event                */

        Sim_Tick();                   /* advance the host-side plant      */
        RteImpl_PollCanInput();       /* CAN RX: speed frame -> RTE reads */
        AccCtrl_Main();               /* Rte_Read -> control -> Rte_Write */
                                      /* -> Can_Transmit(0x1A0 status)    */
        ThrottleActr_Run();           /* consumer side: Rte_Read throttle */

        cycles++;
        elapsedMs = cycles * DEMO_TICK_MS;
        if (elapsedMs >= DEMO_TOTAL_MS) {
            break; /* demo run finished */
        }
    }

    printf("\n=== demo finished after %u cycles (%u ms simulated) ===\n",
           (unsigned)cycles, (unsigned)elapsedMs);
    return 0;
}