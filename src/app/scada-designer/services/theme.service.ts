import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type DesignerTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<DesignerTheme>('light');
  readonly isDark = computed(() => this.theme() === 'dark');

  setTheme(theme: DesignerTheme): void {
    this.theme.set(theme);
    this.document.body.dataset['theme'] = theme;
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }
}
