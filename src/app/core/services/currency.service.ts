import { Injectable, effect, signal } from '@angular/core';

export interface Currency {
  id: string;
  name: string;
  code: string;
}

export interface NewCurrency {
  name: string;
  code: string;
}

const DEFAULT_CURRENCIES: Currency[] = [
  { id: 'currency-uah', name: 'Гривна', code: 'UAH' },
  { id: 'currency-usd', name: 'Доллар', code: 'USD' },
  { id: 'currency-eur', name: 'Евро', code: 'EUR' },
];

const DEFAULT_CURRENCY_ID = 'currency-uah';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly storageKey = 'finpocket-currencies';
  private readonly defaultStorageKey = 'finpocket-default-currency';

  private readonly currenciesSignal = signal<Currency[]>(this.loadCurrencies());
  private readonly defaultCurrencySignal = signal<string>(
    this.loadDefaultCurrency(this.currenciesSignal())
  );

  readonly currencies = this.currenciesSignal.asReadonly();
  readonly defaultCurrency = this.defaultCurrencySignal.asReadonly();

  constructor() {
    this.ensureDefaultCurrency(this.currenciesSignal());

    effect(() => {
      const currencies = this.currenciesSignal();
      this.persistCurrencies(currencies);
      this.ensureDefaultCurrency(currencies);
    });

    effect(() => {
      this.persistDefaultCurrency(this.defaultCurrencySignal());
    });
  }

  addCurrency(currency: NewCurrency): void {
    const name = currency.name.trim();
    const code = currency.code.trim().toUpperCase();

    if (!name || !code) {
      return;
    }

    const currencyId = this.generateId(code);

    this.currenciesSignal.update((currencies) => [
      ...currencies,
      {
        id: currencyId,
        name,
        code,
      },
    ]);
  }

  updateCurrency(id: string, changes: Partial<NewCurrency>): void {
    const name = changes.name !== undefined ? changes.name.trim() : undefined;
    const code = changes.code !== undefined ? changes.code.trim().toUpperCase() : undefined;

    if (name === '' || code === '') {
      return;
    }

    this.currenciesSignal.update((currencies) =>
      currencies.map((currency) =>
        currency.id === id
          ? {
              ...currency,
              ...(name !== undefined ? { name } : {}),
              ...(code !== undefined ? { code } : {}),
            }
          : currency
      )
    );
  }

  removeCurrency(id: string): void {
    if (this.defaultCurrencySignal() === id) {
      return;
    }

    this.currenciesSignal.update((currencies) => currencies.filter((currency) => currency.id !== id));
  }

  setDefaultCurrency(id: string): void {
    if (this.defaultCurrencySignal() === id) {
      return;
    }

    const exists = this.currenciesSignal().some((currency) => currency.id === id);

    if (!exists) {
      return;
    }

    this.defaultCurrencySignal.set(id);
  }

  private ensureDefaultCurrency(currencies: Currency[]): void {
    if (!currencies.length) {
      this.defaultCurrencySignal.set('');
      return;
    }

    const currentDefault = this.defaultCurrencySignal();
    const hasDefault = currencies.some((currency) => currency.id === currentDefault);

    if (!hasDefault) {
      this.defaultCurrencySignal.set(currencies[0].id);
    }
  }

  private loadCurrencies(): Currency[] {
    const win = this.safeWindow();

    if (!win) {
      return [...DEFAULT_CURRENCIES];
    }

    try {
      const stored = win.localStorage.getItem(this.storageKey);
      if (!stored) {
        return [...DEFAULT_CURRENCIES];
      }

      const parsed: unknown = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        return [...DEFAULT_CURRENCIES];
      }

      const sanitized: Currency[] = parsed
        .map((item) => this.sanitizeCurrency(item))
        .filter((currency): currency is Currency => currency !== null);

      return sanitized.length ? sanitized : [...DEFAULT_CURRENCIES];
    } catch {
      return [...DEFAULT_CURRENCIES];
    }
  }

  private loadDefaultCurrency(currencies: Currency[]): string {
    const win = this.safeWindow();

    if (!win) {
      return this.resolveFallbackDefault(currencies);
    }

    try {
      const stored = win.localStorage.getItem(this.defaultStorageKey);
      if (typeof stored === 'string' && stored) {
        return stored;
      }
    } catch {
      // Ignore storage errors and fallback to defaults.
    }

    return this.resolveFallbackDefault(currencies);
  }

  private sanitizeCurrency(value: unknown): Currency | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const maybeCurrency = value as Partial<Currency>;
    const id = typeof maybeCurrency.id === 'string' && maybeCurrency.id.trim() ? maybeCurrency.id.trim() : null;
    const name = typeof maybeCurrency.name === 'string' && maybeCurrency.name.trim() ? maybeCurrency.name.trim() : null;
    const code = typeof maybeCurrency.code === 'string' && maybeCurrency.code.trim() ? maybeCurrency.code.trim().toUpperCase() : null;

    if (!id || !name || !code) {
      return null;
    }

    return { id, name, code };
  }

  private persistCurrencies(currencies: Currency[]): void {
    const win = this.safeWindow();

    if (!win) {
      return;
    }

    try {
      win.localStorage.setItem(this.storageKey, JSON.stringify(currencies));
    } catch {
      // Ignore storage write errors (private mode, quota, etc.).
    }
  }

  private persistDefaultCurrency(defaultCurrencyId: string): void {
    const win = this.safeWindow();

    if (!win) {
      return;
    }

    try {
      if (!defaultCurrencyId) {
        win.localStorage.removeItem(this.defaultStorageKey);
        return;
      }

      win.localStorage.setItem(this.defaultStorageKey, defaultCurrencyId);
    } catch {
      // Ignore storage write errors.
    }
  }

  private resolveFallbackDefault(currencies: Currency[]): string {
    if (currencies.length) {
      const preferred = currencies.find((currency) => currency.id === DEFAULT_CURRENCY_ID);
      return preferred?.id ?? currencies[0].id;
    }

    return DEFAULT_CURRENCY_ID;
  }

  private generateId(code: string): string {
    const normalized = code.toLowerCase();
    let candidate = `currency-${normalized}`;
    const currencies = this.currenciesSignal();

    if (!currencies.some((currency) => currency.id === candidate)) {
      return candidate;
    }

    const uniqueSuffix = Math.random().toString(36).slice(2, 8);
    candidate = `currency-${normalized}-${uniqueSuffix}`;

    return candidate;
  }

  private safeWindow(): (Window & typeof globalThis) | null {
    return typeof window === 'undefined' ? null : window;
  }
}
