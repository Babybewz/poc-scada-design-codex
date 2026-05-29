import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ScadaDesignerComponent } from './scada-designer/scada-designer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ScadaDesignerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-scada-designer />',
})
export class AppComponent {}
