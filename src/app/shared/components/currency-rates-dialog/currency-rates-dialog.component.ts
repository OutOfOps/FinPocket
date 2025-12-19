import { Component, computed, inject, signal } from '@angular/core';
import { Currency, CurrencyService } from '../../../core/services/currency.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-currency-rates-dialog',
    templateUrl: './currency-rates-dialog.component.html',
    styleUrls: ['./currency-rates-dialog.component.scss'],
    standalone: false
})
export class CurrencyRatesDialogComponent {
    private readonly currencyService = inject(CurrencyService);
    private readonly snackBar = inject(MatSnackBar);
    protected readonly dialogRef = inject(MatDialogRef<CurrencyRatesDialogComponent>);

    protected readonly currencies = this.currencyService.currencies;
    protected readonly defaultCurrency = this.currencyService.defaultCurrency;

    // By default compare to the base currency
    protected referenceCurrencyId = signal<string>(this.defaultCurrency());

    protected readonly ratesList = computed(() => {
        const list = this.currencies();
        const refId = this.referenceCurrencyId();
        const refCurrency = list.find(c => c.id === refId);

        if (!refCurrency || refCurrency.rateToBase <= 0) {
            return list.map(c => ({
                ...c,
                relativeRate: c.rateToBase
            }));
        }

        // Rate of C relative to Ref = C.rateToBase / Ref.rateToBase
        // Example: Base USD (1). Ref EUR (1.1). Target GBP (1.3).
        // GBP in EUR = 1.3 / 1.1 = 1.18
        return list.map(c => ({
            ...c,
            relativeRate: c.rateToBase / refCurrency.rateToBase
        }));
    });

    protected nbuCurrencies = new Map<string, { rate: number; txt: string }>();
    protected nbuList: Array<{ code: string; txt: string }> = [];

    protected newCurrencyCode = '';
    protected newCurrencyName = '';
    protected newCurrencyRate = 1;

    protected isLoadingNbu = false;

    constructor() {
        this.currencyService.ensureHryvniaExists();
        void this.loadNbuList();

        // Ensure reference is valid
        if (!this.referenceCurrencyId() && this.currencies().length > 0) {
            this.referenceCurrencyId.set(this.currencies()[0].id);
        }
    }

    protected async loadNbuList(): Promise<void> {
        try {
            this.nbuCurrencies = await this.currencyService.getNbuData();
            this.nbuList = Array.from(this.nbuCurrencies.entries())
                .map(([code, data]) => ({ code, txt: data.txt }))
                .sort((a, b) => a.code.localeCompare(b.code));
        } catch {
            // ignore
        }
    }

    protected setReference(id: string): void {
        this.referenceCurrencyId.set(id);
    }

    protected onNbuCodeSelect(code: string): void {
        const data = this.nbuCurrencies.get(code);
        if (!data) return;

        this.newCurrencyCode = code;
        this.newCurrencyName = data.txt;

        // Initial rate logic is tricky because we might want it relative to the VIEWED reference
        // But physically we store rateToBase.
        // Let's just calculate logic rate to Base for storage.
        const baseCode = this.currencyService.getDefaultCurrencyCode();
        const baseData = this.nbuCurrencies.get(baseCode);

        if (baseData && baseData.rate > 0) {
            // data.rate is Rate in UAH
            // baseData.rate is Rate in UAH

            let targetRate = data.rate;
            if (['XAU', 'XAG', 'XPT', 'XPD'].includes(code)) {
                targetRate = targetRate / 31.1034807;
            }

            let baseRate = baseData.rate;
            if (['XAU', 'XAG', 'XPT', 'XPD'].includes(baseCode)) {
                baseRate = baseRate / 31.1034807;
            }

            // Rate(C) in Base = targetRate / baseRate
            const rateInBase = targetRate / baseRate;
            this.newCurrencyRate = parseFloat(rateInBase.toFixed(6));
        }
    }

    protected addCurrency(): void {
        if (!this.newCurrencyCode || !this.newCurrencyName) return;

        this.currencyService.addCurrency({
            code: this.newCurrencyCode,
            name: this.newCurrencyName,
            rateToBase: this.newCurrencyRate
        });

        this.newCurrencyCode = '';
        this.newCurrencyName = '';
        this.newCurrencyRate = 1;
        this.snackBar.open('Валюта добавлена', undefined, { duration: 1500 });
    }

    protected async syncAllRates(): Promise<void> {
        this.isLoadingNbu = true;
        try {
            await this.currencyService.fetchNbuRates();
            this.snackBar.open('Все курсы обновлены (НБУ)', undefined, { duration: 2000 });
        } catch {
            this.snackBar.open('Ошибка обновления', 'OK', { duration: 2000 });
        } finally {
            this.isLoadingNbu = false;
        }
    }

    protected getCurrencyCode(id: string): string {
        return this.currencies().find(c => c.id === id)?.code || '';
    }
}
