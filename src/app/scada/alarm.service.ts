import { Injectable } from '@angular/core';

import { AlarmState, RealtimeFrame } from './scada.models';

const PRESSURE_HIGH_THRESHOLD = 84;

@Injectable({ providedIn: 'root' })
export class AlarmService {
  evaluate(frame: RealtimeFrame): AlarmState {
    const active = frame.pressure001 > PRESSURE_HIGH_THRESHOLD;

    return {
      active,
      severity: active ? 'HIGH' : 'NORMAL',
      message: active ? `PT-101 HIGH ${frame.pressure001.toFixed(0)} bar` : 'SYSTEM NORMAL',
    };
  }
}
