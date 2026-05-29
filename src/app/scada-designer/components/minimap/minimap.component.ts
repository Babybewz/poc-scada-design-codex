import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ConnectorPort, LayoutConnector } from '../../models/layout.model';
import { LayoutService } from '../../services/layout.service';
import { CanvasViewportService } from '../../services/canvas-viewport.service';
import { SafeSvgPipe } from '../safe-svg.pipe';

@Component({
  selector: 'app-minimap',
  standalone: true,
  imports: [SafeSvgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="canvas-minimap" aria-label="Canvas minimap">
      <div class="canvas-minimap__header">
        <span>Minimap</span>
      </div>
      <svg
        viewBox="0 0 4000 2600"
        class="canvas-minimap__svg"
        (click)="jumpFromMinimap($event)"
      >
        <rect x="0" y="0" width="4000" height="2600" class="canvas-minimap__bg" />
        @if (visibleViewport(); as viewport) {
          <rect
            class="canvas-minimap__viewport"
            [attr.x]="viewport.x"
            [attr.y]="viewport.y"
            [attr.width]="viewport.width"
            [attr.height]="viewport.height"
          />
        }
        @for (connector of connectors(); track connector.id) {
          <path
            class="canvas-minimap__connector"
            [attr.d]="connectorPath(connector)"
          />
        }
        @for (symbol of symbols(); track symbol.id) {
          <svg
            class="canvas-minimap__symbol"
            [attr.x]="symbol.x"
            [attr.y]="symbol.y"
            [attr.width]="symbol.width"
            [attr.height]="symbol.height"
            [attr.transform]="'rotate(' + symbol.rotation + ' ' + (symbol.x + symbol.width / 2) + ' ' + (symbol.y + symbol.height / 2) + ')'"
            [style.--symbol-fill]="symbol.fill"
            [style.--symbol-stroke]="symbol.stroke"
            [style.--symbol-text]="symbol.textColor"
            [style.--symbol-font-size.px]="symbol.fontSize"
            [innerHTML]="symbol.svg | safeSvg"
          >
          </svg>
          @if (symbol.label) {
            <text
              class="canvas-minimap__label"
              [class.canvas-minimap__label--box]="symbol.type === 'text-label'"
              [attr.x]="symbol.x + symbol.width / 2"
              [attr.y]="symbol.type === 'text-label' ? symbol.y + symbol.height / 2 + 18 : symbol.y + symbol.height + 46"
              [attr.fill]="symbol.textColor"
              text-anchor="middle"
            >
              {{ symbol.label }}
            </text>
          }
        }
      </svg>
    </aside>
  `,
})
export class MinimapComponent {
  private readonly layout = inject(LayoutService);
  private readonly viewport = inject(CanvasViewportService);

  readonly symbols = this.layout.symbols;
  readonly connectors = this.layout.connectors;
  readonly visibleViewport = this.viewport.visibleViewport;

  jumpFromMinimap(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();

    this.viewport.requestJump({
      x: Math.round(((event.clientX - rect.left) / rect.width) * 4000),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 2600),
    });
  }

  connectorPath(connector: LayoutConnector): string {
    const start = this.portPoint(connector.sourceId, connector.sourcePort);
    const end = this.portPoint(connector.targetId, connector.targetPort);
    const midX = Math.round((start.x + end.x) / 2);
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  }

  private portPoint(symbolId: string, port: ConnectorPort): { x: number; y: number } {
    const symbol = this.symbols().find((item) => item.id === symbolId);
    if (!symbol) {
      return { x: 0, y: 0 };
    }

    const points = {
      top: { x: symbol.x + symbol.width / 2, y: symbol.y },
      right: { x: symbol.x + symbol.width, y: symbol.y + symbol.height / 2 },
      bottom: { x: symbol.x + symbol.width / 2, y: symbol.y + symbol.height },
      left: { x: symbol.x, y: symbol.y + symbol.height / 2 },
      center: { x: symbol.x + symbol.width / 2, y: symbol.y + symbol.height / 2 },
    };
    const point = points[port];

    return { x: Math.round(point.x), y: Math.round(point.y) };
  }
}
