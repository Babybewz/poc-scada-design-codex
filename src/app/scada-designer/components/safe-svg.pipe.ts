import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeSvg',
  standalone: true,
  pure: true,
})
export class SafeSvgPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
