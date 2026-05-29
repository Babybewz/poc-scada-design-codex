import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SvgLoaderService {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  load(path: string): Observable<SafeHtml> {
    return this.http.get(path, { responseType: 'text' }).pipe(
      map((markup) => {
        return this.sanitizer.bypassSecurityTrustHtml(this.scrubSvg(markup, path));
      }),
    );
  }

  private scrubSvg(markup: string, path: string): string {
    const document = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const parserError = document.querySelector('parsererror');
    const svg = document.querySelector('svg');

    if (parserError || !svg) {
      throw new Error(`Unable to parse SVG: ${path}`);
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
