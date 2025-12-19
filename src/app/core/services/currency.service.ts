import { Injectable, computed, effect, signal } from '@angular/core';

export interface Currency {
  id: string;
  name: string;
  code: string;
  rateToBase: number;
}

export interface NewCurrency {
  name: string;
  code: string;
  rateToBase: number;
}

export interface CurrencySnapshot {
  currencies: Currency[];
  defaultCurrencyId: string;
}

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
  readonly defaultCurrencyDetails = computed(() => {
    const currencies = this.currenciesSignal();

    if (!currencies.length) {
      return null;
    }

    const currentDefault = this.defaultCurrencySignal();
    return currencies.find((currency) => currency.id === currentDefault) ?? currencies[0];
  });

  private readonly currencyMap = computed(() => {
    const map = new Map<string, Currency>();

    for (const currency of this.currenciesSignal()) {
      map.set(currency.code, currency);
    }

    return map;
  });

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
    const rate = this.normalizeRate(currency.rateToBase);

    if (!name || !code || rate === null) {
      return;
    }

    const currencyId = this.generateId(code);

    this.currenciesSignal.update((currencies) => [
      ...currencies,
      {
        id: currencyId,
        name,
        code,
        rateToBase: rate,
      },
    ]);
  }

  updateCurrency(id: string, changes: Partial<NewCurrency>): void {
    const name = changes.name !== undefined ? changes.name.trim() : undefined;
    const code = changes.code !== undefined ? changes.code.trim().toUpperCase() : undefined;
    let rate: number | undefined;

    if (changes.rateToBase !== undefined) {
      const normalizedRate = this.normalizeRate(changes.rateToBase);
      if (normalizedRate === null) {
        return;
      }
      rate = normalizedRate;
    }

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
            ...(rate !== undefined ? { rateToBase: rate } : {}),
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

  normalizeCode(value: string): string {
    const normalized = value.trim();
    if (!normalized) {
      return this.getDefaultCurrencyCode();
    }

    const uppercase = normalized.toUpperCase();

    switch (uppercase) {
      case '₴':
      case 'ГРН':
      case 'ГРИВНА':
        return 'UAH';
      case '$':
      case 'ДОЛЛАР':
        return 'USD';
      case '€':
      case 'ЄВРО':
      case 'ЕВРО':
        return 'EUR';
      default:
        return uppercase;
    }
  }

  convertToDefault(amount: number, currencyCode: string): number {
    const currency = this.currencyMap().get(this.normalizeCode(currencyCode));
    const target = this.defaultCurrencyDetails();

    if (!currency || !target || currency.rateToBase <= 0 || target.rateToBase <= 0) {
      return amount;
    }

    return amount * (currency.rateToBase / target.rateToBase);
  }

  getDefaultCurrencyCode(): string {
    const target = this.defaultCurrencyDetails();
    return target?.code ?? 'UAH';
  }

  resetToDefaults(): void {
    this.currenciesSignal.set([]);
    this.defaultCurrencySignal.set('');

    // Add default UAH
    this.addCurrency({
      code: 'UAH',
      name: 'Українська гривня',
      rateToBase: 1
    });

    // Set as default
    const uah = this.currenciesSignal().find(c => c.code === 'UAH');
    if (uah) {
      this.setDefaultCurrency(uah.id);
    }
  }

  format(amount: number, currencyCode?: string, fractionDigits = 2): string {
    const code = currencyCode ? this.normalizeCode(currencyCode) : this.getDefaultCurrencyCode();

    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }

  getSnapshot(): CurrencySnapshot {
    return {
      currencies: this.currenciesSignal().map((currency) => ({ ...currency })),
      defaultCurrencyId: this.defaultCurrencySignal(),
    };
  }

  restoreSnapshot(snapshot: CurrencySnapshot): void {
    const sanitized = Array.isArray(snapshot.currencies)
      ? snapshot.currencies
        .map((item) => this.sanitizeCurrency(item))
        .filter((currency): currency is Currency => currency !== null)
      : [];

    const finalCurrencies = sanitized;
    this.currenciesSignal.set(finalCurrencies);

    const desiredDefault =
      typeof snapshot.defaultCurrencyId === 'string' ? snapshot.defaultCurrencyId : '';

    const resolvedDefault = finalCurrencies.some((currency) => currency.id === desiredDefault)
      ? desiredDefault
      : this.resolveFallbackDefault(finalCurrencies);

    this.defaultCurrencySignal.set(resolvedDefault);
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
      return [];
    }

    try {
      const stored = win.localStorage.getItem(this.storageKey);
      if (!stored) {
        return [];
      }

      const parsed: unknown = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        return [];
      }

      const sanitized: Currency[] = parsed
        .map((item) => this.sanitizeCurrency(item))
        .filter((currency): currency is Currency => currency !== null);

      return sanitized;
    } catch {
      return [];
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
    const code =
      typeof maybeCurrency.code === 'string' && maybeCurrency.code.trim()
        ? maybeCurrency.code.trim().toUpperCase()
        : null;
    const rate = this.normalizeRate((maybeCurrency as { rateToBase?: unknown }).rateToBase);

    if (!id || !name || !code || rate === null) {
      return null;
    }

    return { id, name, code, rateToBase: rate };
  }

  private normalizeRate(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
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
    return currencies.length ? currencies[0].id : '';
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

  /**
  * Fetches raw NBU data.
  */
  async getNbuData(): Promise<Map<string, { rate: number; txt: string }>> {
    const response = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
    if (!response.ok) throw new Error('API Error');
    const data = await response.json() as Array<{ cc: string; rate: number; txt: string }>;

    const map = new Map<string, { rate: number; txt: string }>();
    data.forEach(i => map.set(i.cc, { rate: i.rate, txt: i.txt }));
    map.set('UAH', { rate: 1, txt: 'Українська гривня' });

    return map;
  }

  // Helper to adjust rate if it is a metal (Convert Oz t to Grams if needed)
  // XAU, XAG, XPT, XPD often quoted by NBU as price for 10 oz or 1 oz?
  // Checking NBU docs: "Exchange rates of gold, silver, platinum, palladium ... per 1 Oz t" (usually).
  // 1 Troy Ounce = 31.1034807 grams.
  // We want Rate Per Gram.
  private adjustNbuRate(code: string, rawRate: number): number {
    const metals = ['XAU', 'XAG', 'XPT', 'XPD'];
    if (metals.includes(code)) {
      // Assuming NBU returns rate for 1 Troy Ounce (which is standard for XAU code in banking APIs)
      // Convert to per gram
      return rawRate / 31.1034807;
    }
    return rawRate;
  }

  /**
   * Updates a single currency's rate from NBU.
   */
  async syncCurrencyRate(currencyId: string): Promise<boolean> {
    try {
      const nbuMap = await this.getNbuData();
      const currentDefaultCode = this.getDefaultCurrencyCode();
      const baseInfo = nbuMap.get(currentDefaultCode);

      if (!baseInfo) {
        console.warn('Base currency not found in NBU rates');
        return false;
      }

      const baseRate = this.adjustNbuRate(currentDefaultCode, baseInfo.rate);

      const currency = this.currenciesSignal().find(c => c.id === currencyId);
      if (!currency) return false;

      // Calculate Relative Rate
      const targetInfo = nbuMap.get(currency.code);
      if (targetInfo) {
        const targetRate = this.adjustNbuRate(currency.code, targetInfo.rate);
        const newRate = targetRate / baseRate;

        this.updateCurrency(currency.id, { rateToBase: newRate });
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async ensureHryvniaExists(): Promise<void> {
    const currencies = this.currenciesSignal();
    const hasUah = currencies.some(c => c.code === 'UAH');

    if (!hasUah) {
      this.addCurrency({
        code: 'UAH',
        name: 'Українська гривня',
        rateToBase: 1
      });
    }
  }

  // Deprecated global fetch, or could be kept as tool
  async fetchNbuRates(): Promise<void> {
    try {
      const nbuMap = await this.getNbuData();
      const currentDefaultCode = this.getDefaultCurrencyCode();
      const baseInfo = nbuMap.get(currentDefaultCode);

      if (!baseInfo) return;

      const baseRate = this.adjustNbuRate(currentDefaultCode, baseInfo.rate);

      this.currenciesSignal().forEach(c => {
        if (c.id === this.defaultCurrencySignal()) {
          this.updateCurrency(c.id, { rateToBase: 1 });
          return;
        }

        const info = nbuMap.get(c.code);
        if (info) {
          const targetRate = this.adjustNbuRate(c.code, info.rate);
          this.updateCurrency(c.id, { rateToBase: targetRate / baseRate });
        }
      });

    } catch (e) {
      console.error('Failed to fetch NBU rates', e);
      throw e;
    }
  }

  private safeWindow(): (Window & typeof globalThis) | null {
    return typeof window === 'undefined' ? null : window;
  }
}
