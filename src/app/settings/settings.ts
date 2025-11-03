import { Component, inject } from '@angular/core';
import { FinpocketTheme, ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly themeService = inject(ThemeService);

  protected readonly theme = this.themeService.theme;

  protected setTheme(theme: FinpocketTheme | string): void {
    if (theme === 'dark' || theme === 'light') {
      this.themeService.setTheme(theme);
    }
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
