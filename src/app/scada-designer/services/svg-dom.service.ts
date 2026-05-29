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

  getSvg(): SVGSVGElement | null {
    return this.host?.querySelector('svg') ?? null;
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

  private findElement(id: string): Element | null {
    return this.host?.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`) ?? null;
  }
}
