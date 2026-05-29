import { Injectable } from '@angular/core';
import { Observable, interval, map, shareReplay, startWith } from 'rxjs';

import { RealtimeFrame } from './scada.models';

@Injectable({ providedIn: 'root' })
export class RealtimeSimulationService {
  readonly frames$: Observable<RealtimeFrame> = interval(2000).pipe(
    startWith(0),
    map(() => ({
      pressure001: this.random(54, 92),
      pressure002: this.random(48, 82),
      flow001: this.random(820, 1220),
      flow002: this.random(540, 960),
      co2: this.random(0.8, 3.8, 2),
      h2o: this.random(12, 46, 1),
    })),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private random(min: number, max: number, decimals = 0): number {
    const value = min + Math.random() * (max - min);
    return Number(value.toFixed(decimals));
  }
}
