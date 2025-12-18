import { DOCUMENT } from '@angular/common';
import { Injectable, Inject, Optional, effect, signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';

export type FinpocketTheme = 'dark' | 'light';
export type FinpocketAccent = 'purple' | 'blue' | 'green' | 'orange';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKeyTheme = 'finpocket-theme';
  private readonly storageKeyAccent = 'finpocket-accent';

  private readonly themeClasses: Record<FinpocketTheme, string> = {
    dark: 'finpocket-dark-theme',
    light: 'finpocket-light-theme',
  };

  private readonly accentClasses: Record<FinpocketAccent, string> = {
    purple: 'acc-purple', // Default, no extra class needed usually but good for consistency
    blue: 'acc-blue',
    green: 'acc-green',
    orange: 'acc-orange',
  };

  private readonly themeSignal = signal<FinpocketTheme>(this.resolveInitialTheme());
  private readonly accentSignal = signal<FinpocketAccent>(this.resolveInitialAccent());

  readonly theme = this.themeSignal.asReadonly();
  readonly accent = this.accentSignal.asReadonly();

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Optional() private readonly overlayContainer: OverlayContainer | null
  ) {
    // Apply initial state
    this.updateBodyClasses();

    // React to changes
    effect(() => {
      const currentTheme = this.themeSignal();
      const currentAccent = this.accentSignal();

      this.updateBodyClasses();
      this.persistTheme(currentTheme);
      this.persistAccent(currentAccent);
    });
  }

  setTheme(theme: FinpocketTheme): void {
    this.themeSignal.set(theme);
  }

  toggleTheme(): void {
    this.themeSignal.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  setAccent(accent: FinpocketAccent): void {
    this.accentSignal.set(accent);
  }

  cycleAccent(): void {
    const accents: FinpocketAccent[] = ['purple', 'blue', 'green', 'orange'];
    const currentIdx = accents.indexOf(this.accentSignal());
    const nextIdx = (currentIdx + 1) % accents.length;
    this.accentSignal.set(accents[nextIdx]);
  }

  resetToDefault(): void {
    this.themeSignal.set('dark');
    this.accentSignal.set('purple');

    const win = this.safeWindow();
    if (win) {
      try {
        win.localStorage.removeItem(this.storageKeyTheme);
        win.localStorage.removeItem(this.storageKeyAccent);
      } catch { }
    }
  }

  private resolveInitialTheme(): FinpocketTheme {
    const win = this.safeWindow();
    if (!win) return 'dark';
    try {
      const stored = win.localStorage.getItem(this.storageKeyTheme) as FinpocketTheme | null;
      if (stored === 'dark' || stored === 'light') return stored;
    } catch { }
    return (win.matchMedia && win.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }

  private resolveInitialAccent(): FinpocketAccent {
    const win = this.safeWindow();
    if (!win) return 'purple';
    try {
      const stored = win.localStorage.getItem(this.storageKeyAccent) as FinpocketAccent | null;
      if (stored && ['purple', 'blue', 'green', 'orange'].includes(stored)) {
        return stored;
      }
    } catch { }
    return 'purple';
  }

  private updateBodyClasses(): void {
    const theme = this.themeSignal();
    const accent = this.accentSignal();

    const classList = this.document.body.classList;
    const overlayClassList = this.overlayContainer?.getContainerElement().classList;

    // Remove all known theme classes
    Object.values(this.themeClasses).forEach(c => {
      classList.remove(c);
      overlayClassList?.remove(c);
    });

    // Remove all known accent classes
    Object.values(this.accentClasses).forEach(c => {
      classList.remove(c);
      overlayClassList?.remove(c);
    });

    // Add current theme class
    const themeClass = this.themeClasses[theme];
    classList.add(themeClass);
    overlayClassList?.add(themeClass);

    // Add current accent class (if not default/empty)
    const accentClass = this.accentClasses[accent];
    if (accentClass) {
      classList.add(accentClass);
      overlayClassList?.add(accentClass);
    }
  }

  private persistTheme(theme: FinpocketTheme): void {
    const win = this.safeWindow();
    if (win) try { win.localStorage.setItem(this.storageKeyTheme, theme); } catch { }
  }

  private persistAccent(accent: FinpocketAccent): void {
    const win = this.safeWindow();
    if (win) try { win.localStorage.setItem(this.storageKeyAccent, accent); } catch { }
  }

  private safeWindow(): (Window & typeof globalThis) | null {
    return typeof window === 'undefined' ? null : window;
  }
}
