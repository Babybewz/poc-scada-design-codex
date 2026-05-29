import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable()
export class SvgDomService {
  private readonly renderer: Renderer2;
  private host: HTMLElement | null = null;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  attach(host: HTMLElement): void {
    this.host = host;
  }

  detach(): void {
    this.host = null;
  }

  findElement<T extends Element = Element>(id: string): T | null {
    if (!this.host) {
      return null;
    }

    return this.host.querySelector<T>(`[id="${this.escapeAttributeValue(id)}"]`);
  }

  getSvg(): SVGSVGElement | null {
    return this.host?.querySelector<SVGSVGElement>('svg') ?? null;
  }

  setFill(id: string, color: string): void {
    this.setAttribute(id, 'fill', color);
  }

  setStroke(id: string, color: string): void {
    this.setAttribute(id, 'stroke', color);
  }

  setText(id: string, value: string | number): void {
    const element = this.findElement(id);
    if (element) {
      this.renderer.setProperty(element, 'textContent', String(value));
    }
  }

  setOpacity(id: string, value: number): void {
    this.setAttribute(id, 'opacity', String(value));
  }

  highlight(id: string): void {
    const element = this.findElement(id);
    if (!element) {
      return;
    }

    this.renderer.addClass(element, 'scada-highlight');
    window.setTimeout(() => this.renderer.removeClass(element, 'scada-highlight'), 900);
  }

  setClass(id: string, className: string, enabled: boolean): void {
    const element = this.findElement(id);
    if (!element) {
      return;
    }

    if (enabled) {
      this.renderer.addClass(element, className);
    } else {
      this.renderer.removeClass(element, className);
    }
  }

  private setAttribute(id: string, name: string, value: string): void {
    const element = this.findElement(id);
    if (element) {
      this.renderer.setAttribute(element, name, value);
    }
  }

  private escapeAttributeValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
