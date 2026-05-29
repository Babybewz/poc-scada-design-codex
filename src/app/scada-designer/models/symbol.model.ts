export type SymbolType =
  | 'valve'
  | 'pump'
  | 'compressor'
  | 'tank'
  | 'sensor'
  | 'pressure-indicator'
  | 'flow-indicator'
  | 'text-label';

export type ValveState = 'OPEN' | 'CLOSED';

export interface SymbolDefinition {
  id: string;
  type: SymbolType;
  name: string;
  svg: string;
  group: string;
  order: number;
}

export interface LayoutSymbol {
  id: string;
  assetId: string;
  type: SymbolType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  textColor: string;
  fontSize: number;
  label: string;
  svg: string;
  valveState?: ValveState;
}

export interface SymbolPatch {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  textColor?: string;
  fontSize?: number;
  label?: string;
  valveState?: ValveState;
}
