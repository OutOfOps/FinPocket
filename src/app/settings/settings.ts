import { Component, computed, inject } from '@angular/core';
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
  protected readonly baseCurrency = computed(() => {
    const defaultId = this.defaultCurrency();
    const available = this.currencies();

    if (!available.length) {
      return null;
    }

    return available.find((currency) => currency.id === defaultId) ?? available[0];
  });

  protected newCurrency = {
    name: '',
    code: '',
    rate: 1,
  };

  protected editingCurrencyId: string | null = null;
  protected editingCurrency = {
    name: '',
    code: '',
    rate: 1,
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
      rateToBase: this.resolveRateForStorage(this.newCurrency.rate),
    });

    this.newCurrency = {
      name: '',
      code: '',
      rate: 1,
    };
  }

  protected startCurrencyEdit(currency: Currency): void {
    this.editingCurrencyId = currency.id;
    this.editingCurrency = {
      name: currency.name,
      code: currency.code,
      rate: this.getRelativeRate(currency),
    };
  }

  protected cancelCurrencyEdit(): void {
    this.editingCurrencyId = null;
    this.editingCurrency = {
      name: '',
      code: '',
      rate: 1,
    };
  }

  protected saveCurrencyEdit(): void {
    if (!this.editingCurrencyId || !this.canSaveCurrencyEdit()) {
      return;
    }

    this.currencyService.updateCurrency(this.editingCurrencyId, {
      name: this.editingCurrency.name,
      code: this.editingCurrency.code,
      rateToBase: this.resolveRateForStorage(this.editingCurrency.rate),
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
    const rate = Number(this.newCurrency.rate);

    return Boolean(name && code && this.isValidRate(rate));
  }

  protected canSaveCurrencyEdit(): boolean {
    const name = this.editingCurrency.name.trim();
    const code = this.editingCurrency.code.trim();
    const rate = Number(this.editingCurrency.rate);

    return Boolean(name && code && this.isValidRate(rate));
  }

  protected getRelativeRate(currency: Currency): number {
    const base = this.baseCurrency();
    if (!base || base.rateToBase <= 0) {
      return currency.rateToBase;
    }

    return currency.rateToBase / base.rateToBase;
  }

  private resolveRateForStorage(inputRate: number): number {
    const rate = Number(inputRate);
    const baseRate = this.getBaseRate();

    return rate * baseRate;
  }

  private getBaseRate(): number {
    const base = this.baseCurrency();

    if (!base || base.rateToBase <= 0) {
      return 1;
    }

    return base.rateToBase;
  }

  private isValidRate(rate: number): boolean {
    return Number.isFinite(rate) && rate > 0;
  }
}
