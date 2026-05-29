import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, map, of, switchMap } from 'rxjs';

import {
  ConnectorDraft,
  ConnectorPort,
  LayoutConnector,
  LayoutSelection,
  ScadaLayout,
  ScadaSymbolAssetGroup,
} from '../models/layout.model';
import { LayoutSymbol, SymbolDefinition, SymbolPatch, SymbolType } from '../models/symbol.model';

export enum SymbolGroupOrder {
  general = 0,
  basic = 10,
  valves = 20,
  pumps = 30,
  compressors = 40,
  tanks = 50,
  sensors = 60,
  uploaded = 900,
}

const DEFAULT_SYMBOLS: readonly SymbolDefinition[] = [
  {
    id: 'VALVE',
    type: 'valve',
    name: 'Valve',
    group: 'general',
    order: SymbolGroupOrder.general,
    svg: '<svg viewBox="0 0 90 64" xmlns="http://www.w3.org/2000/svg"><polygon points="8,14 45,32 8,50 82,50 45,32 82,14"/></svg>',
  },
  {
    id: 'PUMP',
    type: 'pump',
    name: 'Pump',
    group: 'general',
    order: SymbolGroupOrder.general,
    svg: '<svg viewBox="0 0 90 64" xmlns="http://www.w3.org/2000/svg"><circle cx="38" cy="30" r="23"/><path d="M30 15 L56 30 L30 45 Z"/></svg>',
  },
  {
    id: 'COMPRESSOR',
    type: 'compressor',
    name: 'Compressor',
    group: 'basic',
    order: SymbolGroupOrder.basic,
    svg: '<svg viewBox="0 0 90 64" xmlns="http://www.w3.org/2000/svg"><circle cx="38" cy="30" r="24"/><path d="M24 16 L62 30 L24 44 Z"/></svg>',
  },
  {
    id: 'TANK',
    type: 'tank',
    name: 'Tank',
    group: 'basic',
    order: SymbolGroupOrder.basic,
    svg: '<svg viewBox="0 0 90 64" xmlns="http://www.w3.org/2000/svg"><ellipse cx="45" cy="14" rx="24" ry="8"/><rect x="21" y="14" width="48" height="34"/><ellipse cx="45" cy="48" rx="24" ry="8"/></svg>',
  },
  {
    id: 'SENSOR',
    type: 'sensor',
    name: 'Sensor',
    group: 'basic',
    order: SymbolGroupOrder.basic,
    svg: '<svg viewBox="0 0 90 64" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="10" width="42" height="42"/><circle cx="45" cy="31" r="10"/></svg>',
  },
  {
    id: 'PRESSURE',
    type: 'pressure-indicator',
    name: 'Pressure Indicator',
    group: 'general',
    order: SymbolGroupOrder.general,
    svg: '<svg viewBox="0 0 100 64" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="10" width="88" height="44"/><text x="50" y="39" text-anchor="middle">PT</text></svg>',
  },
  {
    id: 'FLOW',
    type: 'flow-indicator',
    name: 'Flow Indicator',
    group: 'general',
    order: SymbolGroupOrder.general,
    svg: '<svg viewBox="0 0 100 64" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="10" width="88" height="44"/><text x="50" y="39" text-anchor="middle">FT</text></svg>',
  },
  {
    id: 'TEXT',
    type: 'text-label',
    name: 'Text Box',
    group: 'general',
    order: SymbolGroupOrder.general,
    svg: '<svg viewBox="0 0 160 56" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="154" height="50" rx="4"/><text x="80" y="35" text-anchor="middle">TEXT</text></svg>',
  },
];

const DEFAULT_STYLE: Record<SymbolType, Pick<LayoutSymbol, 'fill' | 'stroke' | 'textColor' | 'fontSize' | 'label' | 'width' | 'height'>> = {
  valve: { fill: '#00ff66', stroke: '#b9ffd3', textColor: '#ffffff', fontSize: 11, label: 'OPEN', width: 90, height: 64 },
  pump: { fill: '#111111', stroke: '#00ff66', textColor: '#ffffff', fontSize: 11, label: 'PUMP', width: 90, height: 64 },
  compressor: { fill: '#111111', stroke: '#ffd21a', textColor: '#ffffff', fontSize: 11, label: 'COMP', width: 90, height: 64 },
  tank: { fill: '#151515', stroke: '#bdbdbd', textColor: '#ffffff', fontSize: 11, label: 'TANK', width: 90, height: 64 },
  sensor: { fill: '#0b2314', stroke: '#00ff66', textColor: '#ffffff', fontSize: 11, label: 'SENSOR', width: 90, height: 64 },
  'pressure-indicator': { fill: '#06120a', stroke: '#00ff66', textColor: '#00ff66', fontSize: 13, label: 'PT101', width: 100, height: 64 },
  'flow-indicator': { fill: '#06120a', stroke: '#00ff66', textColor: '#00ff66', fontSize: 13, label: 'FT101', width: 100, height: 64 },
  'text-label': { fill: '#06120a', stroke: '#00ff66', textColor: '#00ff66', fontSize: 18, label: 'TEXT', width: 160, height: 56 },
};

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly http = inject(HttpClient);

  readonly symbolLibrary = signal<readonly SymbolDefinition[]>(DEFAULT_SYMBOLS);
  readonly symbolGroups = computed(() => {
    const groups = new Map<string, SymbolDefinition[]>();
    for (const symbol of this.symbolLibrary()) {
      groups.set(symbol.group, [...(groups.get(symbol.group) ?? []), symbol]);
    }

    return [...groups.entries()]
      .map(([group, symbols]) => ({
        group,
        order: this.groupOrder(group),
        symbols: symbols.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.order - b.order || a.group.localeCompare(b.group));
  });
  readonly symbols = signal<readonly LayoutSymbol[]>([
  ]);
  readonly connectors = signal<readonly LayoutConnector[]>([]);
  readonly backgroundPath = signal<string | null>(null);
  readonly selectedIds = signal<readonly string[]>([]);
  readonly selection = signal<LayoutSelection | null>(null);
  readonly connectorDraft = signal<ConnectorDraft | null>(null);
  readonly selectedSymbol = computed(() => {
    const selection = this.selection();
    return selection?.type === 'symbol'
      ? this.symbols().find((symbol) => symbol.id === selection.id) ?? null
      : null;
  });
  readonly selectedConnector = computed(() => {
    const selection = this.selection();
    return selection?.type === 'connector'
      ? this.connectors().find((connector) => connector.id === selection.id) ?? null
      : null;
  });
  readonly savedJson = signal(this.serialize());

  loadAssetSymbolLibrary(): void {
    this.http
      .get<ScadaSymbolAssetGroup[]>('assets/scada/symbols.json')
      .pipe(
        switchMap((groups) => {
          const requests = groups.flatMap((group) =>
            group.symbols.map((symbol) =>
              this.http.get(`assets/scada/${group.group}/${symbol.file}`, { responseType: 'text' }).pipe(
                map((svg) => ({
                  id: symbol.id,
                  name: symbol.name,
                  type: this.toSymbolType(symbol.type ?? group.group),
                  group: group.group,
                  order: group.order ?? this.groupOrder(group.group),
                  svg: this.scrubSvg(svg, symbol.file),
                })),
              ),
            ),
          );

          return requests.length ? forkJoin(requests) : of(DEFAULT_SYMBOLS);
        }),
      )
      .subscribe({
        next: (symbols) => this.symbolLibrary.set(this.mergeLibrary(symbols)),
        error: () => this.symbolLibrary.set(DEFAULT_SYMBOLS),
      });
  }

  addSymbol(assetId: string, x: number, y: number): void {
    const asset = this.symbolLibrary().find((symbol) => symbol.id === assetId);
    if (!asset) {
      return;
    }

    this.symbols.update((symbols) => [...symbols, this.createSymbol(asset, x, y)]);
    this.selectLast();
  }

  addUploadedSymbol(metadata: { id: string; name: string; svg: string }): void {
    const uploaded: SymbolDefinition = {
      id: this.uniqueAssetId(metadata.id),
      name: metadata.name,
      svg: this.scrubSvg(metadata.svg, metadata.name),
      type: 'sensor',
      group: 'uploaded',
      order: SymbolGroupOrder.uploaded,
    };

    this.symbolLibrary.update((symbols) => [...symbols, uploaded]);
    this.save();
  }

  select(id: string, additive = false): void {
    if (!additive) {
      this.selectedIds.set([id]);
      this.selection.set({ type: 'symbol', id });
      return;
    }

    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
    this.selection.set({ type: 'symbol', id });
  }

  selectConnector(id: string): void {
    this.selectedIds.set([]);
    this.selection.set({ type: 'connector', id });
  }

  clearSelection(): void {
    this.selectedIds.set([]);
    this.selection.set(null);
  }

  setBackground(path: string | null): void {
    this.backgroundPath.set(path);
    this.save();
  }

  newEmptyLayout(): void {
    this.symbols.set([]);
    this.connectors.set([]);
    this.backgroundPath.set(null);
    this.selectedIds.set([]);
    this.selection.set(null);
    this.connectorDraft.set(null);
    this.save();
  }

  updateSymbol(id: string, patch: SymbolPatch): void {
    this.symbols.update((symbols) =>
      symbols.map((symbol) => (symbol.id === id ? { ...symbol, ...patch } : symbol)),
    );
  }

  updateConnector(id: string, patch: Partial<Pick<LayoutConnector, 'stroke' | 'label'>>): void {
    this.connectors.update((connectors) =>
      connectors.map((connector) => (connector.id === id ? { ...connector, ...patch } : connector)),
    );
  }

  deleteSelected(): void {
    const selection = this.selection();
    if (!selection) {
      return;
    }

    if (selection.type === 'symbol') {
      this.deleteSymbol(selection.id);
    } else {
      this.deleteConnector(selection.id);
    }
  }

  deleteSymbol(id: string): void {
    this.symbols.update((symbols) => symbols.filter((symbol) => symbol.id !== id));
    this.connectors.update((connectors) =>
      connectors.filter((connector) => connector.sourceId !== id && connector.targetId !== id),
    );
    this.selectedIds.update((ids) => ids.filter((selectedId) => selectedId !== id));
    if (this.selection()?.id === id) {
      this.selection.set(null);
    }
    this.save();
  }

  deleteConnector(id: string): void {
    this.connectors.update((connectors) => connectors.filter((connector) => connector.id !== id));
    if (this.selection()?.id === id) {
      this.selection.set(null);
    }
    this.save();
  }

  moveSymbol(id: string, dx: number, dy: number): void {
    const symbol = this.symbols().find((item) => item.id === id);
    if (!symbol) {
      return;
    }

    this.updateSymbol(id, {
      x: Math.round(symbol.x + dx),
      y: Math.round(symbol.y + dy),
    });
  }

  startConnector(sourceId: string, sourcePort: ConnectorPort): void {
    this.connectorDraft.set({ sourceId, sourcePort });
  }

  finishConnector(targetId: string, targetPort: ConnectorPort): void {
    const draft = this.connectorDraft();
    if (!draft) {
      return;
    }

    if (draft.sourceId === targetId) {
      return;
    }

    this.connectors.update((connectors) => [
      ...connectors,
      {
        id: this.uuid(),
        sourceId: draft.sourceId,
        targetId,
        sourcePort: draft.sourcePort,
        targetPort,
        stroke: '#ffd21a',
        label: '',
      },
    ]);
    this.connectorDraft.set(null);
    this.save();
  }

  cancelConnector(): void {
    this.connectorDraft.set(null);
  }

  toggleValve(id: string): void {
    const symbol = this.symbols().find((item) => item.id === id);
    if (!symbol || symbol.type !== 'valve') {
      return;
    }

    const valveState = symbol.valveState === 'OPEN' ? 'CLOSED' : 'OPEN';
    this.updateSymbol(id, {
      valveState,
      fill: valveState === 'OPEN' ? '#00ff66' : '#ff3030',
      stroke: valveState === 'OPEN' ? '#b9ffd3' : '#ffb3b3',
      textColor: '#ffffff',
      label: valveState,
    });
  }

  serialize(): string {
    const layout: ScadaLayout = {
      symbolLibrary: [...this.symbolLibrary()],
      symbols: [...this.symbols()],
      connectors: [...this.connectors()],
      properties: {
        app: 'SCADA Designer',
        background: this.backgroundPath(),
      },
    };

    return JSON.stringify(layout, null, 2);
  }

  save(): void {
    this.savedJson.set(this.serialize());
  }

  load(json: string): void {
    const layout = JSON.parse(json) as ScadaLayout;
    this.symbolLibrary.set(layout.symbolLibrary?.length ? layout.symbolLibrary : DEFAULT_SYMBOLS);
    this.symbols.set((layout.symbols ?? []).map((symbol) => ({
      ...symbol,
      textColor: symbol.textColor ?? DEFAULT_STYLE[symbol.type]?.textColor ?? '#ffffff',
      fontSize: symbol.fontSize ?? DEFAULT_STYLE[symbol.type]?.fontSize ?? 11,
    })));
    this.connectors.set(layout.connectors ?? []);
    this.backgroundPath.set(layout.properties?.background ?? null);
    this.selectedIds.set([]);
    this.selection.set(null);
    this.connectorDraft.set(null);
    this.savedJson.set(this.serialize());
  }

  private selectLast(): void {
    const last = this.symbols().at(-1);
    if (last) {
      this.selectedIds.set([last.id]);
    }
  }

  private createSymbol(asset: SymbolDefinition, x: number, y: number, label?: string): LayoutSymbol {
    const style = DEFAULT_STYLE[asset.type];

    return {
      id: this.uuid(),
      assetId: asset.id,
      type: asset.type,
      x: Math.round(x),
      y: Math.round(y),
      width: style.width,
      height: style.height,
      rotation: 0,
      fill: style.fill,
      stroke: style.stroke,
      textColor: style.textColor,
      fontSize: style.fontSize,
      label: label ?? style.label,
      svg: asset.svg,
      valveState: asset.type === 'valve' ? 'OPEN' : undefined,
    };
  }

  private uniqueAssetId(id: string): string {
    const normalized = id.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_') || 'SYMBOL';
    const ids = new Set(this.symbolLibrary().map((symbol) => symbol.id));
    let candidate = normalized;
    let index = 2;

    while (ids.has(candidate)) {
      candidate = `${normalized}_${index}`;
      index += 1;
    }

    return candidate;
  }

  private uuid(): string {
    return globalThis.crypto?.randomUUID?.() ?? `symbol-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  }

  private mergeLibrary(symbols: readonly SymbolDefinition[]): readonly SymbolDefinition[] {
    const uploaded = this.symbolLibrary().filter((symbol) => symbol.group === 'uploaded');
    return [...symbols, ...uploaded];
  }

  private groupOrder(group: string): number {
    return SymbolGroupOrder[group as keyof typeof SymbolGroupOrder] ?? 500;
  }

  private toSymbolType(value: string): SymbolType {
    const normalized = value.toLowerCase();
    if (normalized.includes('valve')) {
      return 'valve';
    }
    if (normalized.includes('pump')) {
      return 'pump';
    }
    if (normalized.includes('compressor')) {
      return 'compressor';
    }
    if (normalized.includes('tank')) {
      return 'tank';
    }
    if (normalized.includes('pressure')) {
      return 'pressure-indicator';
    }
    if (normalized.includes('flow')) {
      return 'flow-indicator';
    }
    if (normalized.includes('text')) {
      return 'text-label';
    }
    return 'sensor';
  }

  private scrubSvg(markup: string, source: string): string {
    const document = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const parserError = document.querySelector('parsererror');
    const svg = document.querySelector('svg');

    if (parserError || !svg) {
      throw new Error(`Unable to parse SVG symbol: ${source}`);
    }

    document.querySelectorAll('script, foreignObject').forEach((element) => element.remove());
    document.querySelectorAll('*').forEach((element) => {
      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || value.startsWith('javascript:')) {
          element.removeAttribute(attribute.name);
        }
      }
    });

    return new XMLSerializer().serializeToString(svg);
  }
}
