import { Injectable, inject } from '@angular/core';
import { FinPocketDB } from './finpocket-db.service';
import { CurrencyService } from './currency.service';
import { ThemeService } from './theme.service';
import { OperationAccountsService } from '../../finance/services/operation-accounts.service';
import { MetersStore } from '../../meters/services/meters-store.service';
import { SyncQueue } from '../../sync/sync.queue';
import { SyncSettingsService } from '../../sync/services/sync-settings.service';

@Injectable({ providedIn: 'root' })
export class DataResetService {
  private readonly db = inject(FinPocketDB);
  private readonly currencyService = inject(CurrencyService);
  private readonly themeService = inject(ThemeService);
  private readonly operationAccountsService = inject(OperationAccountsService);
  private readonly metersStore = inject(MetersStore);
  private readonly syncQueue = inject(SyncQueue);
  private readonly syncSettings = inject(SyncSettingsService);

  async resetAllData(): Promise<void> {
    await this.db.transaction('rw', this.db.tables, async () => {
      await this.db.transactions.clear();
      await this.db.accounts.clear();
      await this.db.debts.clear();
      await this.db.debtTransactions.clear();
      await this.db.meters.clear();
      await this.db.categories.clear();
      await this.db.backups.clear();
      await this.db.encryptionKeys.clear();

      // Meters V2
      await this.db.meterObjects.clear();
      await this.db.meterResources.clear();
      await this.db.meterReadings.clear();
      await this.db.tariffs.clear();

      // Subscriptions
      await this.db.subscriptions.clear();
    });

    await this.syncQueue.clear();
    this.syncSettings.reset();

    this.currencyService.resetToDefaults();
    this.operationAccountsService.resetToDefaults();
    this.metersStore.reset();
    this.themeService.resetToDefault();
  }
}
