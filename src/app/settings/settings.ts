import { Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Currency, CurrencyService } from '../core/services/currency.service';
import { FinpocketTheme, ThemeService } from '../core/services/theme.service';
import { DataResetService } from '../core/services/data-reset.service';
import { ResetDataDialogComponent } from './components/reset-data-dialog/reset-data-dialog.component';
import { DataTransferService } from './services/data-transfer.service';
import { BackupService } from '../core/services/backup.service';
import { SyncSettingsService } from '../sync/services/sync-settings.service';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private readonly themeService = inject(ThemeService);
  private readonly currencyService = inject(CurrencyService);
  private readonly dataResetService = inject(DataResetService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly backupService = inject(BackupService);
  protected readonly syncSettings = inject(SyncSettingsService);

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

  protected isResetting = false;
  protected isExportingData = false;
  protected isImportingData = false;

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
