/*
 * sensor_sim.c
 * Host-side vehicle plant: emulates the VehicleSpdSnsr SW-C the same way the
 * generator's seed models it - a vehicle-speed value that grows over time.
 *
 * Real time base: one Sim_Tick() call == one 20 ms host cycle (main.c).
 * Speed ramp: +1 km/h every 2 ticks (40 ms) until 50 km/h, then held at 50.
 */

#include "sensor_sim.h"

#define SIM_RAMP_TOP       50u /* simulated speed ceiling [km/h]          */
#define SIM_TICKS_PER_KPH   2u /* ramp slope: 1 km/h per 2 ticks (40 ms)  */

static uint32 sim_ticks = 0u;  /* number of elapsed host cycles (20 ms)   */

void Sim_Tick(void)
{
    sim_ticks++;
}

VehicleSpeed_T Sim_GetSpeed(void)
{
    uint32 ramp = sim_ticks / SIM_TICKS_PER_KPH;
    return (ramp > SIM_RAMP_TOP) ? SIM_RAMP_TOP : (VehicleSpeed_T)ramp;
}

Boolean_T Sim_GetSpeedValid(void)
{
    /* Sensor self-check during the very first cycle (t = 20 ms). */
    return (sim_ticks >= 1u) ? TRUE : FALSE;
}