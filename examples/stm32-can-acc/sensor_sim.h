#ifndef SENSOR_SIM_H
#define SENSOR_SIM_H

/*
 * Host-side vehicle plant / speed-sensor model (replaces real hardware).
 * Replaced by real speed acquisition when ported to the STM32 target.
 */

#include "rte_contract.h"

/* Advances the simulation by one host tick (one 20 ms cycle). */
void Sim_Tick(void);

/* Current simulated vehicle speed: ramp 0 -> 50 km/h, then held. */
VehicleSpeed_T Sim_GetSpeed(void);

/* Sensor self-test flag: FALSE during the first 20 ms of the run. */
Boolean_T Sim_GetSpeedValid(void);

#endif /* SENSOR_SIM_H */