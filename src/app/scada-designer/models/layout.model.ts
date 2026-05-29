import { LayoutSymbol, SymbolDefinition } from './symbol.model';

export type ConnectorPort = 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface LayoutConnector {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort: ConnectorPort;
  targetPort: ConnectorPort;
  stroke: string;
  label: string;
}

export interface ConnectorDraft {
  sourceId: string;
  sourcePort: ConnectorPort;
}

export interface LayoutSelection {
  type: 'symbol' | 'connector';
  id: string;
}

export interface ScadaSymbolAssetManifestItem {
  id: string;
  name: string;
  file: string;
  type?: string;
}

export interface ScadaSymbolAssetGroup {
  group: string;
  order?: number;
  symbols: ScadaSymbolAssetManifestItem[];
}

export interface ScadaLayout {
  symbolLibrary: SymbolDefinition[];
  symbols: LayoutSymbol[];
  connectors: LayoutConnector[];
  properties: {
    app?: string;
    background?: string | null;
    [key: string]: unknown;
  };
}

export interface ScadaPoint {
  id: 'PT101' | 'FT101' | 'TT101';
  value: number;
  unit: string;
  alarm: boolean;
}
