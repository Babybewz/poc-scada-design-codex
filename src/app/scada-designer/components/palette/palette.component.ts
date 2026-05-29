import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { LayoutService } from '../../services/layout.service';
import { SafeSvgPipe } from '../safe-svg.pipe';

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CdkDrag, CdkDropList, SafeSvgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="palette-panel" cdkDropList id="symbol-palette">
      <h2>Symbol Palette</h2>

      <label class="upload-symbol">
        <span>Upload SVG</span>
        <input type="file" accept=".svg,image/svg+xml" (change)="uploadSvg($event)" />
      </label>

      @for (group of groups(); track group.group) {
        <section class="palette-group">
          <button
            type="button"
            class="palette-group__header"
            [attr.aria-expanded]="!isCollapsed(group.group)"
            (click)="toggleGroup(group.group)"
          >
            <span>{{ group.group }}</span>
            <span class="palette-group__arrow" aria-hidden="true">{{ isCollapsed(group.group) ? 'v' : '^' }}</span>
          </button>

          @if (!isCollapsed(group.group)) {
            <div class="palette-group__items">
              @for (symbol of group.symbols; track symbol.id) {
                <div class="palette-item" cdkDrag [cdkDragData]="symbol.id">
                  <div class="symbol-icon" [innerHTML]="symbol.svg | safeSvg"></div>
                  <span>{{ symbol.name }}</span>
                </div>
              }
            </div>
          }
        </section>
      }
    </aside>
  `,
})
export class PaletteComponent implements OnInit {
  private readonly layout = inject(LayoutService);

  readonly groups = this.layout.symbolGroups;
  readonly collapsedGroups = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.layout.loadAssetSymbolLibrary();
  }

  uploadSvg(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const svg = String(reader.result ?? '');
      const name = file.name.replace(/\.svg$/i, '');
      this.layout.addUploadedSymbol({
        id: name,
        name,
        svg,
      });
      input.value = '';
    };
    reader.readAsText(file);
  }

  isCollapsed(group: string): boolean {
    return this.collapsedGroups()[group] ?? false;
  }

  toggleGroup(group: string): void {
    this.collapsedGroups.update((groups) => ({
      ...groups,
      [group]: !(groups[group] ?? false),
    }));
  }
}
