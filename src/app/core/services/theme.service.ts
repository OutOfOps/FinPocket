import { DOCUMENT } from '@angular/common';
import { Injectable, Inject, Optional, effect, signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';

export type FinpocketTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'finpocket-theme';
  private readonly themeClasses: Record<FinpocketTheme, string> = {
    dark: 'finpocket-dark-theme',
    light: 'finpocket-light-theme',
  };

  private readonly themeSignal = signal<FinpocketTheme>(this.resolveInitialTheme());

  readonly theme = this.themeSignal.asReadonly();

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Optional() private readonly overlayContainer: OverlayContainer | null
  ) {
    this.applyThemeClass(this.themeSignal());

    effect(() => {
      const current = this.themeSignal();
      this.applyThemeClass(current);
      this.persistTheme(current);
    });
  }

  setTheme(theme: FinpocketTheme): void {
    if (this.themeSignal() === theme) {
      return;
    }

    this.themeSignal.set(theme);
  }

  toggleTheme(): void {
    this.themeSignal.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  private resolveInitialTheme(): FinpocketTheme {
    const win = this.safeWindow();

    if (win) {
      try {
        const stored = win.localStorage.getItem(this.storageKey) as FinpocketTheme | null;
        if (stored === 'dark' || stored === 'light') {
          return stored;
        }
      } catch {
        // Ignore storage errors and fallback to media query/default.
      }

      if (win.matchMedia && win.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }

      if (win.matchMedia && win.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }

    return 'dark';
  }

  private applyThemeClass(theme: FinpocketTheme): void {
    const classList = this.document.body.classList;
    const overlayClassList = this.overlayContainer?.getContainerElement().classList ?? null;

    Object.values(this.themeClasses).forEach((themeClass) => {
      classList.remove(themeClass);
      overlayClassList?.remove(themeClass);
    });

    const themeClass = this.themeClasses[theme];
    classList.add(themeClass);
    overlayClassList?.add(themeClass);
  }

  private persistTheme(theme: FinpocketTheme): void {
    const win = this.safeWindow();

    if (!win) {
      return;
    }

    try {
      win.localStorage.setItem(this.storageKey, theme);
    } catch {
      // Ignore storage write errors (private mode, etc.).
    }
  }

  private safeWindow(): (Window & typeof globalThis) | null {
    return typeof window === 'undefined' ? null : window;
  }
}
