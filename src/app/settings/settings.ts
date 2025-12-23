import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Currency, CurrencyService } from '../core/services/currency.service';
import { FinpocketTheme, ThemeService } from '../core/services/theme.service';
import { DataResetService } from '../core/services/data-reset.service';
import { ResetDataDialogComponent } from './components/reset-data-dialog/reset-data-dialog.component';
import { DataTransferService } from './services/data-transfer.service';
import { BackupService } from '../core/services/backup.service';
import { SyncSettingsService } from '../sync/services/sync-settings.service';
import { OperationAccountsService, NewAccount, OperationAccount, AccountType } from '../finance/services/operation-accounts.service';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { APP_VERSION } from '../core/tokens/app-version.token';
import { PwaUpdateService } from '../core/services/pwa-update.service';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly themeService = inject(ThemeService);
  private readonly currencyService = inject(CurrencyService);
  private readonly accountsService = inject(OperationAccountsService);
  private readonly dataResetService = inject(DataResetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly backupService = inject(BackupService);
  protected readonly syncSettings = inject(SyncSettingsService);
  protected readonly appVersion = inject(APP_VERSION);
  private readonly pwaUpdateService = inject(PwaUpdateService);

  protected readonly theme = this.themeService.theme;
  protected readonly accent = this.themeService.accent;
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

  protected isResetting = false;
  protected isExportingData = false;
  protected isImportingData = false;
  protected isLoadingRates = false;
  protected isCheckingUpdates = false;

  protected setTheme(theme: FinpocketTheme | string): void {
    if (theme === 'dark' || theme === 'light') {
      this.themeService.setTheme(theme);
    }
  }

  protected setAccent(accent: string): void {
    if (['purple', 'blue', 'green', 'orange'].includes(accent)) {
      this.themeService.setAccent(accent as any);
    }
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected async loadNbuRates(): Promise<void> {
    if (this.isLoadingRates) return;
    this.isLoadingRates = true;
    try {
      await this.currencyService.fetchNbuRates();
      this.snackBar.open('Курсы валют обновлены (НБУ)', undefined, { duration: 3000 });
    } catch (e) {
      this.snackBar.open('Не удалось загрузить курсы', 'OK', { duration: 3000 });
    } finally {
      this.isLoadingRates = false;
    }
  }

  protected updateRate(currency: Currency, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newRelativeRate = parseFloat(input.value);

    if (!newRelativeRate || newRelativeRate <= 0) return;

    this.currencyService.updateCurrency(currency.id, {
      rateToBase: this.resolveRateForStorage(newRelativeRate)
    });
  }

  protected nbuCurrencies = new Map<string, { rate: number; txt: string }>();
  protected nbuList: Array<{ code: string; txt: string }> = [];

  constructor() {
    this.currencyService.ensureHryvniaExists();
    // Pre-fetch NBU list for the dropdown
    this.loadNbuList();
  }

  protected async loadNbuList(): Promise<void> {
    try {
      this.nbuCurrencies = await this.currencyService.getNbuData();
      this.nbuList = Array.from(this.nbuCurrencies.entries())
        .map(([code, data]) => ({ code, txt: data.txt }))
        .sort((a, b) => a.code.localeCompare(b.code));

      this.nbuMetals = this.nbuList.filter(item =>
        ['XAU', 'XAG', 'XPT', 'XPD'].includes(item.code)
      );
    } catch {
      // Ignore
    }
  }

  protected nbuMetals: Array<{ code: string; txt: string }> = [];

  protected async checkUpdate(): Promise<void> {
    if (this.isCheckingUpdates) return;
    this.isCheckingUpdates = true;

    // Visual feedback
    this.snackBar.open('Проверка обновлений...', undefined, { duration: 2000 });

    try {
      const hasUpdate = await this.pwaUpdateService.checkForUpdate();
      if (hasUpdate) {
        const ref = this.snackBar.open('Доступна новая версия!', 'Обновиться', { duration: 10000 });
        ref.onAction().subscribe(() => {
          this.pwaUpdateService.activateUpdate().then(() => window.location.reload());
        });
      } else {
        this.snackBar.open('У вас установлена последняя версия', undefined, { duration: 3000 });
      }
    } catch (err) {
      this.snackBar.open('Ошибка при проверке обновлений', 'OK', { duration: 3000 });
    } finally {
      this.isCheckingUpdates = false;
    }
  }

  // When user selects a code from dropdown, fill name and estimated rate
  protected onNbuCodeSelect(code: string): void {
    const data = this.nbuCurrencies.get(code);
    if (!data) return;

    this.newCurrency.code = code;
    this.newCurrency.name = data.txt;

    // Estimate rate relative to current base
    // Need base rate in UAH
    const baseCode = this.currencyService.getDefaultCurrencyCode();
    const baseData = this.nbuCurrencies.get(baseCode);

    if (baseData && baseData.rate > 0) {
      // Adjust if metal
      let targetRate = data.rate;
      if (['XAU', 'XAG', 'XPT', 'XPD'].includes(code)) {
        targetRate = targetRate / 31.1034807;
      }

      let baseRate = baseData.rate;
      if (['XAU', 'XAG', 'XPT', 'XPD'].includes(baseCode)) {
        baseRate = baseRate / 31.1034807;
      }

      const relRate = targetRate / baseRate;
      this.newCurrency.rate = parseFloat(relRate.toFixed(4));
    } else {
      this.newCurrency.rate = 1;
    }
  }

  protected onMetalSelect(metalName: string, target: 'new' | 'edit'): void {
    const metalItem = this.nbuMetals.find(m => m.txt === metalName);
    if (!metalItem) return;

    if (target === 'new') {
      this.newAccount.currencyCode = metalItem.code;
    } else {
      this.editingAccount.currencyCode = metalItem.code;
    }

    // Also ensure this "Metal Currency" exists in our system so we can track rate?
    // Actually, if it's not in currencies, we can't calculate total balance.
    // So we should silently add it if missing? 
    // User said "currency for metal is not needed", but for calculation we need it.
    // Let's assume user accepts it being added as a currency if they add a metal account.
    // Or we just rely on NBU lookup at runtime? But TransactionsStore uses CurrencyService.

    // Check if exists, if not add it
    const exists = this.currencies().some(c => c.code === metalItem.code);
    if (!exists) {
      // We need its rate to add it.
      const rateData = this.nbuCurrencies.get(metalItem.code);
      const baseCode = this.currencyService.getDefaultCurrencyCode();
      const baseData = this.nbuCurrencies.get(baseCode);

      let rate = 1;
      if (rateData && baseData && baseData.rate > 0) {
        let targetRate = rateData.rate / 31.1034807; // Metal always per gram

        let baseRate = baseData.rate;
        if (['XAU', 'XAG', 'XPT', 'XPD'].includes(baseCode)) {
          baseRate = baseRate / 31.1034807;
        }

        rate = targetRate / baseRate;
      }

      this.currencyService.addCurrency({
        code: metalItem.code,
        name: metalItem.txt,
        rateToBase: rate
      });
    }
  }

  protected readonly accounts = this.accountsService.accounts;

  protected newAccount: NewAccount = {
    name: '',
    type: 'cash',
    currencyCode: 'UAH',
    initialBalance: 0,
    includeInTotal: true
  };

  protected editingAccountId: string | null = null;
  protected editingAccount: NewAccount = {
    name: '',
    type: 'cash',
    currencyCode: 'UAH',
    initialBalance: 0,
    includeInTotal: true
  };

  protected canAddAccount(): boolean {
    return !!this.newAccount.name.trim() && !!this.newAccount.currencyCode;
  }

  protected addAccount(): void {
    if (!this.canAddAccount()) return;

    // If currency not selected, default to base
    if (!this.newAccount.currencyCode) {
      this.newAccount.currencyCode = this.currencyService.getDefaultCurrencyCode();
    }

    this.accountsService.addAccount(this.newAccount);

    // Reset form
    this.newAccount = {
      name: '',
      type: 'cash',
      currencyCode: this.currencyService.getDefaultCurrencyCode(),
      initialBalance: 0,
      includeInTotal: true
    };
  }

  protected removeAccount(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Удаление счета',
        message: 'Вы уверены, что хотите удалить этот счет? Операция необратима.',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.accountsService.removeAccount(id);
        if (this.editingAccountId === id) {
          this.cancelAccountEdit();
        }
      }
    });
  }

  protected startAccountEdit(account: OperationAccount): void {
    this.editingAccountId = account.id;
    this.editingAccount = {
      name: account.name,
      type: account.type,
      currencyCode: account.currencyCode,
      initialBalance: account.initialBalance,
      bankName: account.bankName,
      metalName: account.metalName,
      includeInTotal: account.includeInTotal !== false // Ensure not undefined
    };
  }

  protected cancelAccountEdit(): void {
    this.editingAccountId = null;
    this.editingAccount = {
      name: '',
      type: 'cash',
      currencyCode: 'UAH',
      initialBalance: 0,
      includeInTotal: true
    };
  }

  protected saveAccountEdit(): void {
    if (!this.editingAccountId || !this.editingAccount.name.trim()) return;

    this.accountsService.updateAccount(this.editingAccountId, this.editingAccount);
    this.cancelAccountEdit();
  }


  protected async loadRateFor(currencyId: string): Promise<void> {
    const success = await this.currencyService.syncCurrencyRate(currencyId);
    if (success) {
      this.snackBar.open('Курс обновлен', undefined, { duration: 1500 });
    } else {
      this.snackBar.open('Не удалось обновить курс', 'OK', { duration: 3000 });
    }
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

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Удаление валюты',
        message: 'Вы уверены? Это может повлиять на отображение исторических данных, если они были в этой валюте.',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.currencyService.removeCurrency(currencyId);
        if (this.editingCurrencyId === currencyId) {
          this.cancelCurrencyEdit();
        }
      }
    });
  }

  protected setDefaultCurrency(currencyId: string): void {
    this.currencyService.setDefaultCurrency(currencyId);
  }


  protected openResetDataDialog(): void {
    if (this.isResetting) {
      return;
    }

    const dialogRef = this.dialog.open(ResetDataDialogComponent, {
      width: '420px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.resetApplicationData();
      }
    });
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

  private async resetApplicationData(): Promise<void> {
    if (this.isResetting) {
      return;
    }

    this.isResetting = true;

    try {
      await this.dataResetService.resetAllData();
      this.cancelCurrencyEdit();
      this.newCurrency = {
        name: '',
        code: '',
        rate: 1,
      };
      this.snackBar.open('Данные очищены. Можно начинать сначала.', 'Закрыть', {
        duration: 4000,
      });
    } catch (error) {
      console.error('Failed to reset application data', error);
      this.snackBar.open('Не удалось очистить данные. Повторите попытку позже.', 'Закрыть', {
        duration: 5000,
      });
    } finally {
      this.isResetting = false;
    }
  }

  protected async downloadBackup(): Promise<void> {
    if (this.isExportingData) {
      return;
    }

    this.isExportingData = true;

    try {
      await this.backupService.exportBackup();
      this.snackBar.open('Резервная копия сохранена в файл.', 'Закрыть', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to export backup', error);
      this.snackBar.open('Не удалось сохранить файл. Попробуйте снова.', 'Закрыть', {
        duration: 5000,
      });
    } finally {
      this.isExportingData = false;
    }
  }

  protected triggerImport(): void {
    const input = document.getElementById('backup-file-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    this.isImportingData = true;

    try {
      await this.backupService.importBackup(file);
      this.snackBar.open(
        'Данные успешно восстановлены! Приложение перезагрузится...',
        undefined,
        {
          duration: 3000,
        }
      );
      // Give valid UI feedback time before reload
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to import backup', error);
      this.snackBar.open('Не удалось прочитать файл резервной копии.', 'Закрыть', {
        duration: 5000,
      });
    } finally {
      this.isImportingData = false;
      input.value = ''; // Reset input to allow re-selection of same file
    }
  }
}
