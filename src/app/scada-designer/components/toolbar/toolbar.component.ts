import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LayoutService } from '../../services/layout.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="designer-toolbar">
      <div>
        <p>SCADA Designer</p>
        <h1>Industrial HMI Canvas</h1>
      </div>

      <div class="designer-toolbar__actions">
        <button type="button" (click)="newEmpty()">New</button>
        <button type="button" (click)="save()">Save JSON</button>
        <button type="button" (click)="load()">Load JSON</button>
        <button type="button" class="theme-toggle" (click)="toggleTheme()">
          {{ theme.isDark() ? 'Light' : 'Dark' }}
        </button>
      </div>
    </header>
  `,
})
export class ToolbarComponent {
  private readonly layout = inject(LayoutService);
  readonly theme = inject(ThemeService);

  newEmpty(): void {
    this.layout.newEmptyLayout();
  }

  save(): void {
    this.layout.save();
  }

  load(): void {
    this.layout.load(this.layout.savedJson());
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}
