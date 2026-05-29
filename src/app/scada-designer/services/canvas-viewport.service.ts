import { Injectable, computed, signal } from '@angular/core';

const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 2600;

export interface CanvasJumpRequest {
  id: number;
  point: {
    x: number;
    y: number;
  };
}

@Injectable({ providedIn: 'root' })
export class CanvasViewportService {
  private nextJumpId = 1;

  readonly pan = signal({ x: 0, y: 0 });
  readonly zoom = signal(1);
  readonly viewportSize = signal({ width: 1, height: 1 });
  readonly jumpRequest = signal<CanvasJumpRequest | null>(null);
  readonly visibleViewport = computed(() => {
    const pan = this.pan();
    const zoom = this.zoom();
    const viewport = this.viewportSize();

    return {
      x: Math.max(0, Math.round(-pan.x / zoom)),
      y: Math.max(0, Math.round(-pan.y / zoom)),
      width: Math.min(CANVAS_WIDTH, Math.round(viewport.width / zoom)),
      height: Math.min(CANVAS_HEIGHT, Math.round(viewport.height / zoom)),
    };
  });

  setViewportState(pan: { x: number; y: number }, zoom: number, viewportSize: { width: number; height: number }): void {
    this.pan.set(pan);
    this.zoom.set(zoom);
    this.viewportSize.set(viewportSize);
  }

  requestJump(point: { x: number; y: number }): void {
    this.jumpRequest.set({
      id: this.nextJumpId,
      point,
    });
    this.nextJumpId += 1;
  }
}
