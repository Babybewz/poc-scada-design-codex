import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, inject } from '@angular/core';

import { CanvasComponent } from './components/canvas/canvas.component';
import { MinimapComponent } from './components/minimap/minimap.component';
import { PaletteComponent } from './components/palette/palette.component';
import { PropertyPanelComponent } from './components/property-panel/property-panel.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-scada-designer',
  standalone: true,
  imports: [CdkDropListGroup, CanvasComponent, MinimapComponent, PaletteComponent, PropertyPanelComponent, ToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <main class="designer-shell" cdkDropListGroup>
      <app-toolbar />
      <section class="designer-layout">
        <div class="left-rail">
          <app-palette />
          <app-minimap />
        </div>
        <app-canvas />
        <app-property-panel />
      </section>
    </main>
  `,
})
export class ScadaDesignerComponent implements OnInit {
  private readonly theme = inject(ThemeService);

  ngOnInit(): void {
    this.theme.setTheme(this.theme.theme());
  }
}
