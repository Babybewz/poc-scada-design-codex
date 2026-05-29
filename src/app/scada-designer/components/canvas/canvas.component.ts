import { CdkDrag, CdkDragEnd, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import svgPanZoom, { SvgPanZoomInstance } from 'svg-pan-zoom';

import { ConnectorPort, LayoutConnector, ScadaPoint } from '../../models/layout.model';
import { LayoutSymbol } from '../../models/symbol.model';
import { CanvasViewportService } from '../../services/canvas-viewport.service';
import { LayoutService } from '../../services/layout.service';
import { ScadaService } from '../../services/scada.service';
import { SvgDomService } from '../../services/svg-dom.service';
import { SvgLoaderService } from '../../services/svg-loader.service';
import { SafeSvgPipe } from '../safe-svg.pipe';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CdkDrag, CdkDropList, SafeSvgPipe],
  providers: [SvgDomService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <section
      class="canvas-panel"
      cdkDropList
      [cdkDropListSortingDisabled]="true"
      id="plant-canvas"
      tabindex="0"
      (cdkDropListDropped)="dropSymbol($event)"
      (click)="clearSelection()"
      (keydown)="handleKeydown($event)"
      #canvas
    >
      <div class="canvas-header">
        <span>Canvas</span>
        <div>
          <button type="button" (click)="zoomIn(); $event.stopPropagation()">+</button>
          <button type="button" (click)="zoomOut(); $event.stopPropagation()">-</button>
          <button type="button" (click)="resetView(); $event.stopPropagation()">Reset</button>
        </div>
      </div>

      <div
        class="plant-viewport"
        [class.plant-viewport--connecting]="isConnecting()"
        (pointermove)="trackConnectorPreview($event)"
        (pointerup)="cancelConnectorPreview($event)"
      >
        <div class="plant-background" #svgHost>
          @if (svgContent(); as backgroundSvg) {
            <div class="plant-background__svg" [innerHTML]="backgroundSvg"></div>
          } @else {
            <svg class="empty-canvas-svg" viewBox="0 0 4000 2600" xmlns="http://www.w3.org/2000/svg" aria-label="Empty SCADA designer canvas">
              <rect width="4000" height="2600" fill="transparent" />
            </svg>
          }
        </div>

        <svg class="connection-layer" [attr.viewBox]="connectionViewBox" [style.transform]="overlayTransform()">
          <defs>
            <marker id="connector-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
              <path d="M1 1 L11 6 L1 11 Z" fill="#ffd21a" />
            </marker>
          </defs>
          @for (connector of connectors(); track connector.id) {
            <path
              class="connector-path"
              [class.connector-path--selected]="isConnectorSelected(connector.id)"
              [attr.d]="connectorPath(connector)"
              [attr.stroke]="connector.stroke"
              marker-end="url(#connector-arrow)"
              (click)="selectConnector(connector, $event)"
            />
            @if (connector.label) {
              <text
                class="connector-label"
                [attr.x]="connectorLabelPoint(connector).x"
                [attr.y]="connectorLabelPoint(connector).y"
              >
                {{ connector.label }}
              </text>
            }
          }
          @if (previewConnectorPath(); as path) {
            <path
              class="connector-path connector-path--preview"
              [attr.d]="path"
              stroke="#ffd21a"
              marker-end="url(#connector-arrow)"
            />
          }
        </svg>

        <div class="symbol-layer" [style.transform]="overlayTransform()">
          @for (symbol of symbols(); track symbol.id) {
            <div
              class="canvas-symbol"
              cdkDrag
              [class.canvas-symbol--selected]="isSelected(symbol.id)"
              [class.canvas-symbol--connecting]="isConnectorSource(symbol.id)"
              [class.canvas-symbol--alarm]="isAlarmSymbol(symbol)"
              [class.canvas-symbol--text-label]="symbol.type === 'text-label'"
              [style.left.px]="symbol.x"
              [style.top.px]="symbol.y"
              [style.width.px]="symbol.width"
              [style.height.px]="symbol.height"
              [style.transform]="'rotate(' + symbol.rotation + 'deg)'"
              [style.--symbol-fill]="symbol.fill"
              [style.--symbol-stroke]="symbol.stroke"
              [style.--symbol-text]="symbol.textColor"
              [style.--symbol-font-size.px]="symbol.fontSize"
              (click)="selectSymbol(symbol, $event)"
              (dblclick)="toggleValve(symbol, $event)"
              (cdkDragEnded)="dragEnded(symbol, $event)"
            >
              <div class="symbol-art" [innerHTML]="symbol.svg | safeSvg"></div>
              <div class="symbol-label">{{ symbol.label }}</div>
              <button type="button" class="symbol-port symbol-port--top" title="Top port" (pointerdown)="startPortConnector(symbol, 'top', $event)" (pointerup)="finishPortConnector(symbol, 'top', $event)"></button>
              <button type="button" class="symbol-port symbol-port--right" title="Right port" (pointerdown)="startPortConnector(symbol, 'right', $event)" (pointerup)="finishPortConnector(symbol, 'right', $event)"></button>
              <button type="button" class="symbol-port symbol-port--bottom" title="Bottom port" (pointerdown)="startPortConnector(symbol, 'bottom', $event)" (pointerup)="finishPortConnector(symbol, 'bottom', $event)"></button>
              <button type="button" class="symbol-port symbol-port--left" title="Left port" (pointerdown)="startPortConnector(symbol, 'left', $event)" (pointerup)="finishPortConnector(symbol, 'left', $event)"></button>
              <button type="button" class="symbol-resize-handle" title="Resize" (pointerdown)="startResize(symbol, $event)"></button>
            </div>
          }
        </div>

      </div>
    </section>
  `,
})
export class CanvasComponent implements AfterViewInit {
  @ViewChild('canvas', { static: true })
  private readonly canvas!: ElementRef<HTMLElement>;

  @ViewChild('svgHost', { static: true })
  private readonly svgHost!: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly layout = inject(LayoutService);
  private readonly scada = inject(ScadaService);
  private readonly svgDom = inject(SvgDomService);
  private readonly svgLoader = inject(SvgLoaderService);
  private readonly viewport = inject(CanvasViewportService);
  private readonly backgroundPath$ = toObservable(this.layout.backgroundPath);
  private readonly minimapJumpEffect = effect(() => {
    const request = this.viewport.jumpRequest();
    if (!request || !this.panZoom) {
      return;
    }

    untracked(() => this.panToCanvasPoint(request.point));
  });

  private panZoom: SvgPanZoomInstance | null = null;
  private resizeState: {
    id: string;
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null = null;

  readonly svgContent = signal<SafeHtml | null>(null);
  readonly symbols = this.layout.symbols;
  readonly connectors = this.layout.connectors;
  readonly selectedIds = this.layout.selectedIds;
  readonly points = signal<readonly ScadaPoint[]>([]);
  readonly previewPoint = signal<{ x: number; y: number } | null>(null);
  readonly pan = signal({ x: 0, y: 0 });
  readonly zoom = signal(1);
  readonly viewportSize = signal({ width: 1, height: 1 });
  readonly overlayTransform = computed(() => {
    const pan = this.pan();
    return `translate(${pan.x}px, ${pan.y}px) scale(${this.zoom()})`;
  });
  readonly connectionViewBox = '0 0 4000 2600';
  readonly previewConnectorPath = computed(() => {
    const draft = this.layout.connectorDraft();
    const previewPoint = this.previewPoint();
    if (!draft || !previewPoint) {
      return null;
    }

    const start = this.portPoint(draft.sourceId, draft.sourcePort);
    return this.orthogonalPath(start, previewPoint);
  });

  ngAfterViewInit(): void {
    this.svgDom.attach(this.svgHost.nativeElement);
    this.updateViewportSize();
    globalThis.addEventListener('resize', this.windowResize);
    this.destroyRef.onDestroy(() => globalThis.removeEventListener('resize', this.windowResize));

    this.backgroundPath$
      .pipe(
        switchMap((path) => (path ? this.svgLoader.load(path) : of(null))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((svg) => {
        this.svgContent.set(svg);
        queueMicrotask(() => this.initializePanZoom());
      });

    this.scada.points$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((points) => {
        this.points.set(points);
        this.applyScadaPoints(points);
      });
  }

  dropSymbol(event: CdkDragDrop<unknown>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const assetId = event.item.data as string;
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const pan = this.pan();
    const zoom = this.zoom();
    const x = (event.dropPoint.x - rect.left - pan.x) / zoom;
    const y = (event.dropPoint.y - rect.top - pan.y - 42) / zoom;
    this.layout.addSymbol(assetId, x, y);
  }

  selectSymbol(symbol: LayoutSymbol, event: MouseEvent): void {
    event.stopPropagation();
    this.canvas.nativeElement.focus();
    this.layout.select(symbol.id, event.shiftKey);
  }

  clearSelection(): void {
    this.layout.cancelConnector();
    this.previewPoint.set(null);
    this.layout.clearSelection();
  }

  dragEnded(symbol: LayoutSymbol, event: CdkDragEnd): void {
    const distance = event.distance;
    const zoom = this.zoom();
    this.layout.moveSymbol(symbol.id, distance.x / zoom, distance.y / zoom);
    event.source.reset();
    this.layout.save();
  }

  startResize(symbol: LayoutSymbol, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.canvas.nativeElement.focus();
    this.layout.select(symbol.id);
    this.resizeState = {
      id: symbol.id,
      startX: event.clientX,
      startY: event.clientY,
      width: symbol.width,
      height: symbol.height,
    };

    globalThis.addEventListener('pointermove', this.resizeMove);
    globalThis.addEventListener('pointerup', this.resizeEnd, { once: true });
  }

  toggleValve(symbol: LayoutSymbol, event: MouseEvent): void {
    event.stopPropagation();
    this.layout.toggleValve(symbol.id);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return;
    }

    event.preventDefault();
    this.layout.deleteSelected();
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  isConnectorSelected(id: string): boolean {
    const selection = this.layout.selection();
    return selection?.type === 'connector' && selection.id === id;
  }

  selectConnector(connector: LayoutConnector, event: MouseEvent): void {
    event.stopPropagation();
    this.canvas.nativeElement.focus();
    this.layout.selectConnector(connector.id);
  }

  isConnectorSource(id: string): boolean {
    return this.layout.connectorDraft()?.sourceId === id;
  }

  isConnecting(): boolean {
    return this.layout.connectorDraft() !== null;
  }

  isAlarmSymbol(symbol: LayoutSymbol): boolean {
    return symbol.type === 'pressure-indicator' && this.points().some((point) => point.id === 'PT101' && point.alarm);
  }

  startPortConnector(symbol: LayoutSymbol, port: ConnectorPort, event: PointerEvent): void {
    event.stopPropagation();
    const draft = this.layout.connectorDraft();
    if (draft && draft.sourceId !== symbol.id) {
      this.layout.finishConnector(symbol.id, port);
      this.previewPoint.set(null);
    } else {
      this.layout.startConnector(symbol.id, port);
      this.previewPoint.set(this.portPoint(symbol.id, port));
      this.layout.select(symbol.id);
    }
  }

  finishPortConnector(symbol: LayoutSymbol, port: ConnectorPort, event: PointerEvent): void {
    event.stopPropagation();
    this.layout.finishConnector(symbol.id, port);
    this.previewPoint.set(null);
  }

  trackConnectorPreview(event: PointerEvent): void {
    if (!this.layout.connectorDraft()) {
      return;
    }

    this.previewPoint.set(this.clientPointToCanvas(event.clientX, event.clientY));
  }

  cancelConnectorPreview(event: PointerEvent): void {
    if (!this.layout.connectorDraft()) {
      return;
    }

    event.stopPropagation();
    this.layout.cancelConnector();
    this.previewPoint.set(null);
  }

  connectorPath(connector: LayoutConnector): string {
    const start = this.portPoint(connector.sourceId, connector.sourcePort);
    const end = this.portPoint(connector.targetId, connector.targetPort);
    return this.orthogonalPath(start, end);
  }

  connectorLabelPoint(connector: LayoutConnector): { x: number; y: number } {
    const start = this.portPoint(connector.sourceId, connector.sourcePort);
    const end = this.portPoint(connector.targetId, connector.targetPort);

    return {
      x: Math.round((start.x + end.x) / 2),
      y: Math.round((start.y + end.y) / 2) - 8,
    };
  }

  zoomIn(): void {
    this.panZoom?.zoomIn();
  }

  zoomOut(): void {
    this.panZoom?.zoomOut();
  }

  resetView(): void {
    this.panZoom?.resetZoom();
    this.panZoom?.fit();
    this.panZoom?.center();
    this.syncViewportTransform();
  }

  panToCanvasPoint(point: { x: number; y: number }): void {
    if (!this.panZoom) {
      return;
    }

    const viewport = this.viewportSize();
    const zoom = this.zoom();

    this.panZoom.pan({
      x: Math.round(viewport.width / 2 - point.x * zoom),
      y: Math.round(viewport.height / 2 - point.y * zoom),
    });
    this.syncViewportTransform();
  }

  private initializePanZoom(): void {
    const svg = this.svgDom.getSvg();
    if (!svg) {
      return;
    }

    this.panZoom?.destroy();
    this.panZoom = svgPanZoom(svg, {
      center: true,
      controlIconsEnabled: false,
      fit: true,
      maxZoom: 8,
      minZoom: 0.4,
      onPan: () => this.syncViewportTransform(),
      onZoom: () => this.syncViewportTransform(),
      zoomScaleSensitivity: 0.2,
    });
    this.syncViewportTransform();
  }

  private syncViewportTransform(): void {
    if (!this.panZoom) {
      return;
    }

    this.updateViewportSize();
    const pan = this.panZoom.getPan();
    const zoom = this.panZoom.getZoom();
    const viewportSize = this.viewportSize();

    this.pan.set(pan);
    this.zoom.set(zoom);
    this.viewport.setViewportState(pan, zoom, viewportSize);
  }

  private updateViewportSize(): void {
    const viewport = this.canvas.nativeElement.querySelector<HTMLElement>('.plant-viewport');
    const rect = (viewport ?? this.canvas.nativeElement).getBoundingClientRect();
    this.viewportSize.set({
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    });
  }

  private applyScadaPoints(points: readonly ScadaPoint[]): void {
    for (const point of points) {
      if (point.id === 'PT101') {
        this.svgDom.setText('PRESSURE_001', `${point.value} BAR`);
        this.svgDom.setClass('PRESSURE_001', 'designer-alarm', point.alarm);
        this.svgDom.setClass('PRESSURE_BOX_001', 'designer-alarm', point.alarm);
      }

      if (point.id === 'FT101') {
        this.svgDom.setText('FLOW_001', `${point.value} MMSCFD`);
      }

      if (point.id === 'TT101') {
        this.svgDom.setText('TT101', `${point.value} C`);
      }
    }
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

  private clientPointToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const viewport = this.canvas.nativeElement.querySelector<HTMLElement>('.plant-viewport');
    const rect = (viewport ?? this.canvas.nativeElement).getBoundingClientRect();
    const pan = this.pan();
    const zoom = this.zoom();

    return {
      x: Math.round((clientX - rect.left - pan.x) / zoom),
      y: Math.round((clientY - rect.top - pan.y) / zoom),
    };
  }

  private orthogonalPath(start: { x: number; y: number }, end: { x: number; y: number }): string {
    const midX = Math.round((start.x + end.x) / 2);
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  }

  private readonly resizeMove = (event: PointerEvent): void => {
    if (!this.resizeState) {
      return;
    }

    const zoom = this.zoom();
    const width = Math.max(24, Math.round(this.resizeState.width + (event.clientX - this.resizeState.startX) / zoom));
    const height = Math.max(24, Math.round(this.resizeState.height + (event.clientY - this.resizeState.startY) / zoom));
    this.layout.updateSymbol(this.resizeState.id, { width, height });
  };

  private readonly resizeEnd = (): void => {
    globalThis.removeEventListener('pointermove', this.resizeMove);
    this.resizeState = null;
    this.layout.save();
  };

  private readonly windowResize = (): void => {
    this.updateViewportSize();
    this.syncViewportTransform();
  };
}
