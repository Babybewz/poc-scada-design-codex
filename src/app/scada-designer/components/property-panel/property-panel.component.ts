import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LayoutSymbol, SymbolPatch } from '../../models/symbol.model';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-property-panel',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="property-panel">
      <h2>Properties</h2>

      @if (selected(); as symbol) {
        <div class="property-group">
          <label>
            <span>id</span>
            <input [ngModel]="symbol.id" readonly />
          </label>

          <label>
            <span>type</span>
            <input [ngModel]="symbol.type" readonly />
          </label>

          <label>
            <span>x</span>
            <input type="number" [ngModel]="symbol.x" (ngModelChange)="updateNumber(symbol, 'x', $event)" />
          </label>

          <label>
            <span>y</span>
            <input type="number" [ngModel]="symbol.y" (ngModelChange)="updateNumber(symbol, 'y', $event)" />
          </label>

          <label>
            <span>rotation</span>
            <input type="number" [ngModel]="symbol.rotation" (ngModelChange)="updateNumber(symbol, 'rotation', $event)" />
          </label>

          <label>
            <span>width</span>
            <input type="number" [ngModel]="symbol.width" (ngModelChange)="updateNumber(symbol, 'width', $event)" />
          </label>

          <label>
            <span>height</span>
            <input type="number" [ngModel]="symbol.height" (ngModelChange)="updateNumber(symbol, 'height', $event)" />
          </label>

          <label>
            <span>fill</span>
            <input type="color" [ngModel]="symbol.fill" (ngModelChange)="update(symbol, { fill: $event })" />
          </label>

          <label>
            <span>stroke</span>
            <input type="color" [ngModel]="symbol.stroke" (ngModelChange)="update(symbol, { stroke: $event })" />
          </label>

          <label>
            <span>text color</span>
            <input type="color" [ngModel]="symbol.textColor" (ngModelChange)="update(symbol, { textColor: $event })" />
          </label>

          <label>
            <span>font size</span>
            <input type="number" min="6" max="72" [ngModel]="symbol.fontSize" (ngModelChange)="updateNumber(symbol, 'fontSize', $event)" />
          </label>

          <label>
            <span>label</span>
            <input [ngModel]="symbol.label" (ngModelChange)="update(symbol, { label: $event })" />
          </label>

          <button type="button" class="connect-button" (click)="startConnector(symbol)">
            Start Connector
          </button>
          <button type="button" class="delete-button" (click)="deleteSelected()">
            Delete Symbol
          </button>
        </div>
      } @else if (selectedConnector(); as connector) {
        <div class="property-group">
          <label>
            <span>id</span>
            <input [ngModel]="connector.id" readonly />
          </label>

          <label>
            <span>source</span>
            <input [ngModel]="connector.sourceId + ' / ' + connector.sourcePort" readonly />
          </label>

          <label>
            <span>target</span>
            <input [ngModel]="connector.targetId + ' / ' + connector.targetPort" readonly />
          </label>

          <label>
            <span>stroke</span>
            <input type="color" [ngModel]="connector.stroke" (ngModelChange)="updateConnector(connector.id, { stroke: $event })" />
          </label>

          <label>
            <span>label</span>
            <input [ngModel]="connector.label" (ngModelChange)="updateConnector(connector.id, { label: $event })" />
          </label>

          <button type="button" class="delete-button" (click)="deleteSelected()">
            Delete Connector
          </button>
        </div>
      } @else {
        <p class="empty-state">Select a symbol on the canvas.</p>
      }

      <section class="layout-json">
        <h3>Layout JSON</h3>
        <textarea [ngModel]="json()" (ngModelChange)="json.set($event)" spellcheck="false"></textarea>
        <button type="button" (click)="loadJson()">Restore JSON</button>
      </section>
    </aside>
  `,
})
export class PropertyPanelComponent {
  readonly layout = inject(LayoutService);
  readonly selected = this.layout.selectedSymbol;
  readonly selectedConnector = this.layout.selectedConnector;
  readonly json = this.layout.savedJson;

  update(symbol: LayoutSymbol, patch: SymbolPatch): void {
    this.layout.updateSymbol(symbol.id, patch);
    this.layout.save();
  }

  updateNumber(symbol: LayoutSymbol, property: 'x' | 'y' | 'rotation' | 'width' | 'height' | 'fontSize', value: string | number): void {
    this.update(symbol, { [property]: Number(value) || 0 });
  }

  startConnector(symbol: LayoutSymbol): void {
    this.layout.startConnector(symbol.id, 'right');
  }

  updateConnector(id: string, patch: { stroke?: string; label?: string }): void {
    this.layout.updateConnector(id, patch);
    this.layout.save();
  }

  deleteSelected(): void {
    this.layout.deleteSelected();
  }

  loadJson(): void {
    this.layout.load(this.json());
  }
}
