import { Injectable } from '@angular/core';
import { Observable, interval, map, shareReplay, startWith } from 'rxjs';

import { ScadaPoint } from '../models/layout.model';

@Injectable({ providedIn: 'root' })
export class ScadaService {
  readonly points$: Observable<readonly ScadaPoint[]> = interval(2000).pipe(
    startWith(0),
    map(() => {
      const pressure = this.random(55, 92);
      const flow = this.random(800, 1260);
      const temperature = this.random(34, 72);

      return [
        { id: 'PT101', value: pressure, unit: 'bar', alarm: pressure > 84 },
        { id: 'FT101', value: flow, unit: 'MMSCFD', alarm: false },
        { id: 'TT101', value: temperature, unit: 'C', alarm: temperature > 64 },
      ] satisfies readonly ScadaPoint[];
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private random(min: number, max: number): number {
    return Math.round(min + Math.random() * (max - min));
  }
}
