declare module 'svg-pan-zoom' {
  export interface SvgPanZoomInstance {
    center(): void;
    destroy(): void;
    fit(): void;
    getPan(): { x: number; y: number };
    getZoom(): number;
    pan(point: { x: number; y: number }): void;
    resetZoom(): void;
    zoomIn(): void;
    zoomOut(): void;
  }

  export interface SvgPanZoomOptions {
    center?: boolean;
    controlIconsEnabled?: boolean;
    fit?: boolean;
    maxZoom?: number;
    minZoom?: number;
    onPan?: () => void;
    onZoom?: () => void;
    zoomScaleSensitivity?: number;
  }

  export default function svgPanZoom(
    element: SVGSVGElement | string,
    options?: SvgPanZoomOptions,
  ): SvgPanZoomInstance;
}
