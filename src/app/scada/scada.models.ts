export type ValveStatus = 'OPEN' | 'CLOSED';

export type ValveId = 'VALVE_BV1' | 'VALVE_BV2' | 'VALVE_BV3';

export type AnalogTagId =
  | 'PRESSURE_001'
  | 'PRESSURE_002'
  | 'FLOW_001'
  | 'FLOW_002'
  | 'CO2_001'
  | 'H2O_001';

export interface ValveState {
  id: ValveId;
  status: ValveStatus;
}

export interface AnalogPoint {
  id: AnalogTagId;
  label: string;
  unit: string;
  value: number;
}

export interface RealtimeFrame {
  pressure001: number;
  pressure002: number;
  flow001: number;
  flow002: number;
  co2: number;
  h2o: number;
}

export interface AlarmState {
  active: boolean;
  severity: 'NORMAL' | 'HIGH';
  message: string;
}

export interface TagSnapshot {
  id: string;
  label: string;
  value: string;
  alarm?: boolean;
}
