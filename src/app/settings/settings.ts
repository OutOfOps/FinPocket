import { Component, inject } from '@angular/core';
import { Currency, CurrencyService } from '../core/services/currency.service';
import { FinpocketTheme, ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly themeService = inject(ThemeService);
  private readonly currencyService = inject(CurrencyService);

  protected readonly theme = this.themeService.theme;
  protected readonly currencies = this.currencyService.currencies;
  protected readonly defaultCurrency = this.currencyService.defaultCurrency;

  protected newCurrency = {
    name: '',
    code: '',
  };

  protected editingCurrencyId: string | null = null;
  protected editingCurrency = {
    name: '',
    code: '',
  };

  protected setTheme(theme: FinpocketTheme | string): void {
    if (theme === 'dark' || theme === 'light') {
      this.themeService.setTheme(theme);
    }
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected addCurrency(): void {
    if (!this.canAddCurrency()) {
      return;
    }

    this.currencyService.addCurrency({
      name: this.newCurrency.name,
      code: this.newCurrency.code,
    });

    this.newCurrency = {
      name: '',
      code: '',
    };
  }

  protected startCurrencyEdit(currency: Currency): void {
    this.editingCurrencyId = currency.id;
    this.editingCurrency = {
      name: currency.name,
      code: currency.code,
    };
  }

  protected cancelCurrencyEdit(): void {
    this.editingCurrencyId = null;
    this.editingCurrency = {
      name: '',
      code: '',
    };
  }

  protected saveCurrencyEdit(): void {
    if (!this.editingCurrencyId || !this.canSaveCurrencyEdit()) {
      return;
    }

    this.currencyService.updateCurrency(this.editingCurrencyId, {
      name: this.editingCurrency.name,
      code: this.editingCurrency.code,
    });

    this.cancelCurrencyEdit();
  }

  protected removeCurrency(currencyId: string): void {
    if (this.defaultCurrency() === currencyId) {
      return;
    }

    this.currencyService.removeCurrency(currencyId);

    if (this.editingCurrencyId === currencyId) {
      this.cancelCurrencyEdit();
    }
  }

  protected setDefaultCurrency(currencyId: string): void {
    this.currencyService.setDefaultCurrency(currencyId);
  }

  protected trackCurrency(_: number, currency: Currency): string {
    return currency.id;
  }

  protected canAddCurrency(): boolean {
    const name = this.newCurrency.name.trim();
    const code = this.newCurrency.code.trim();

    return Boolean(name && code);
  }

  protected canSaveCurrencyEdit(): boolean {
    const name = this.editingCurrency.name.trim();
    const code = this.editingCurrency.code.trim();

    return Boolean(name && code);
  }
}
