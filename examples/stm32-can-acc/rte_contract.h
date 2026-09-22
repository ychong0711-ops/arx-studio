/*******************************************************************************
* rte_contract.h
* -----------------------------------------------------------------------------
* Hand-written, fixed copy of the generator's contract-phase RTE output
* (src/lib/rte.ts: Rte_Type.h + Rte_<SWC>.h style) for the ACC demo.
*
* Naming rules reproduced from the generator:
*   Rte_Read_ <SWC> _ <Port> _ <DataElement> (T* data)  required (SR) port
*   Rte_Write_<SWC> _ <Port> _ <DataElement> (T  data)  provided (SR) port
*   Runnable signature:  void <SWC>_<Mode>(void)
*
* The implementation lives in rte_impl.c / acc_app.c / throttle_actr.c.
*******************************************************************************/

#ifndef RTE_CONTRACT_H
#define RTE_CONTRACT_H

#include "Std_Types.h"
#include "Platform_Types.h"

/* ---- Application primitive types (Rte_Type.h style) -------------------- */
typedef uint16  VehicleSpeed_T; /* range: 0..250 KmPerHour */
typedef uint16  Distance_T;     /* range: 0..200 Meter     */
typedef uint8   Percent_T;      /* range: 0..100 Percent   */
typedef boolean Boolean_T;      /* range: FALSE..TRUE      */

/* ---- Sender-Receiver explicit access points ---------------------------- */
/* AccCtrl requires VehicleSpeed_If (port R_VehicleSpeed)                   */
extern Std_ReturnType Rte_Read_AccCtrl_R_VehicleSpeed_vehicleSpeed(
    VehicleSpeed_T *data);
extern Std_ReturnType Rte_Read_AccCtrl_R_VehicleSpeed_speedValid(
    Boolean_T *data);

/* AccCtrl provides ThrottleCmd_If (port P_ThrottleCmd)                     */
extern Std_ReturnType Rte_Write_AccCtrl_P_ThrottleCmd_throttleReq(
    Percent_T data);
/* AccCtrl provides BrakeCmd_If (port P_BrakeCmd)                           */
extern Std_ReturnType Rte_Write_AccCtrl_P_BrakeCmd_brakeReq(
    Percent_T data);

/* ThrottleActr requires ThrottleCmd_If (port R_ThrottleCmd)                */
extern Std_ReturnType Rte_Read_ThrottleActr_R_ThrottleCmd_throttleReq(
    Percent_T *data);

/* ---- Runnable entities -------------------------------------------------- */
extern void AccCtrl_Init(void);    /* InitEvent - startup                    */
extern void AccCtrl_Main(void);    /* TimingEvent - every 20 ms              */
extern void ThrottleActr_Run(void); /* TimingEvent - every 20 ms             */

#endif /* RTE_CONTRACT_H */