import { Injectable, inject } from '@angular/core';
import {
  AccountEntity,
  BackupEntity,
  DebtEntity,
  DebtTransactionEntity,
  EncryptionKeyEntity,
  FinPocketDB,
  MeterReadingEntity,
  TransactionEntity,
  CategoryEntity,
  SyncQueueEntity,
} from '../../core/services/finpocket-db.service';
import { Currency, CurrencyService } from '../../core/services/currency.service';
import { FinpocketTheme, ThemeService } from '../../core/services/theme.service';
import {
  OperationAccount,
  OperationAccountsService,
} from '../../finance/services/operation-accounts.service';
import { DataResetService } from '../../core/services/data-reset.service';

type FinPocketExportSchemaVersion = 1;

interface FinPocketDexieSnapshot {
  transactions: TransactionEntity[];
  accounts: AccountEntity[];
  debts: DebtEntity[];
  debtTransactions: DebtTransactionEntity[];
  meters: MeterReadingEntity[];
  categories: CategoryEntity[];
  backups: BackupEntity[];
  syncQueue: SyncQueueEntity[];
  encryptionKeys: EncryptionKeyEntity[];
}

export interface FinPocketExportSnapshot {
  schemaVersion: FinPocketExportSchemaVersion;
  exportedAt: string;
  theme: FinpocketTheme;
  currencies: Currency[];
  defaultCurrencyId: string;
  operationAccounts: OperationAccount[];
  dexie: FinPocketDexieSnapshot;
}

@Injectable({ providedIn: 'root' })
export class DataTransferService {
  private readonly db = inject(FinPocketDB);
  private readonly currencyService = inject(CurrencyService);
  private readonly themeService = inject(ThemeService);
  private readonly operationAccountsService = inject(OperationAccountsService);
  private readonly dataResetService = inject(DataResetService);

  async exportAsJson(pretty = true): Promise<string> {
    const snapshot = await this.buildSnapshot();
    return JSON.stringify(snapshot, null, pretty ? 2 : undefined);
  }

  async buildSnapshot(): Promise<FinPocketExportSnapshot> {
    const [dexie, currencySnapshot, accountSnapshot, theme] = await Promise.all([
      this.collectDexieSnapshot(),
      Promise.resolve(this.currencyService.getSnapshot()),
      Promise.resolve(this.operationAccountsService.getSnapshot()),
      Promise.resolve(this.themeService.theme()),
    ]);

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      theme,
      currencies: currencySnapshot.currencies.map((currency) => ({ ...currency })),
      defaultCurrencyId: currencySnapshot.defaultCurrencyId,
      operationAccounts: accountSnapshot.accounts.map((account) => ({ ...account })),
      dexie,
    };
  }

  async importFromJson(json: string): Promise<void> {
    const trimmed = json.trim();

    if (!trimmed) {
      throw new Error('Поле импорта пустое. Вставьте данные экспорта.');
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      throw new Error('Не удалось разобрать JSON. Проверьте формат данных.');
    }

    const snapshot = this.validateSnapshot(parsed);
    await this.applySnapshot(snapshot);
  }

  private async collectDexieSnapshot(): Promise<FinPocketDexieSnapshot> {
    return await this.db.transaction('r', this.db.tables, async () => ({
        transactions: await this.db.transactions.toArray(),
        accounts: await this.db.accounts.toArray(),
        debts: await this.db.debts.toArray(),
        debtTransactions: await this.db.debtTransactions.toArray(),
        meters: await this.db.meters.toArray(),
        categories: await this.db.categories.toArray(),
        backups: await this.db.backups.toArray(),
        syncQueue: await this.db.syncQueue.toArray(),
        encryptionKeys: await this.db.encryptionKeys.toArray(),
      }));
  }

  private validateSnapshot(payload: unknown): FinPocketExportSnapshot {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Некорректный формат данных. Ожидается объект с настройками.');
    }

    const snapshot = payload as Partial<FinPocketExportSnapshot> & { schemaVersion?: number };

    if (snapshot.schemaVersion !== 1) {
      throw new Error('Версия дампа не поддерживается. Обновите приложение и повторите попытку.');
    }

    const theme = snapshot.theme === 'light' ? 'light' : 'dark';
    const currencies = Array.isArray(snapshot.currencies) ? snapshot.currencies : [];
    const operationAccounts = Array.isArray(snapshot.operationAccounts) ? snapshot.operationAccounts : [];
    const defaultCurrencyId = typeof snapshot.defaultCurrencyId === 'string' ? snapshot.defaultCurrencyId : '';
    const exportedAt = typeof snapshot.exportedAt === 'string' ? snapshot.exportedAt : new Date().toISOString();
    const dexie = this.sanitizeDexieSnapshot(snapshot.dexie);

    return {
      schemaVersion: 1,
      exportedAt,
      theme,
      currencies: currencies
        .filter((value): value is Currency =>
          !!value && typeof value === 'object' && typeof (value as Currency).id === 'string'
        )
        .map((currency) => ({ ...currency })),
      defaultCurrencyId,
      operationAccounts: operationAccounts
        .filter((value): value is OperationAccount =>
          !!value && typeof value === 'object' && typeof (value as OperationAccount).id === 'string'
        )
        .map((account) => ({ ...account })),
      dexie,
    };
  }

  private sanitizeDexieSnapshot(input: unknown): FinPocketDexieSnapshot {
    const source = input && typeof input === 'object' ? (input as Partial<FinPocketDexieSnapshot>) : {};

    const ensureArray = <T>(value: unknown): T[] => {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .filter((entry) => !!entry && typeof entry === 'object')
        .map((entry) => JSON.parse(JSON.stringify(entry)) as T);
    };

    return {
      transactions: ensureArray<TransactionEntity>(source.transactions),
      accounts: ensureArray<AccountEntity>(source.accounts),
      debts: ensureArray<DebtEntity>(source.debts),
      debtTransactions: ensureArray<DebtTransactionEntity>(source.debtTransactions),
      meters: ensureArray<MeterReadingEntity>(source.meters),
      categories: ensureArray<CategoryEntity>(source.categories),
      backups: ensureArray<BackupEntity>(source.backups),
      syncQueue: ensureArray<SyncQueueEntity>(source.syncQueue),
      encryptionKeys: ensureArray<EncryptionKeyEntity>(source.encryptionKeys),
    };
  }

  private async applySnapshot(snapshot: FinPocketExportSnapshot): Promise<void> {
    await this.dataResetService.resetAllData();

    this.currencyService.restoreSnapshot({
      currencies: snapshot.currencies,
      defaultCurrencyId: snapshot.defaultCurrencyId,
    });

    this.operationAccountsService.restoreSnapshot({ accounts: snapshot.operationAccounts });
    this.themeService.setTheme(snapshot.theme);

    await this.db.transaction('rw', this.db.tables, async () => {
        await this.db.transactions.clear();
        await this.db.accounts.clear();
        await this.db.debts.clear();
        await this.db.debtTransactions.clear();
        await this.db.meters.clear();
        await this.db.categories.clear();
        await this.db.backups.clear();
        await this.db.syncQueue.clear();
        await this.db.encryptionKeys.clear();

        if (snapshot.dexie.transactions.length) {
          await this.db.transactions.bulkPut(snapshot.dexie.transactions);
        }
        if (snapshot.dexie.accounts.length) {
          await this.db.accounts.bulkPut(snapshot.dexie.accounts);
        }
        if (snapshot.dexie.debts.length) {
          await this.db.debts.bulkPut(snapshot.dexie.debts);
        }
        if (snapshot.dexie.debtTransactions.length) {
          await this.db.debtTransactions.bulkPut(snapshot.dexie.debtTransactions);
        }
        if (snapshot.dexie.meters.length) {
          await this.db.meters.bulkPut(snapshot.dexie.meters);
        }
        if (snapshot.dexie.categories.length) {
          await this.db.categories.bulkPut(snapshot.dexie.categories);
        }
        if (snapshot.dexie.backups.length) {
          await this.db.backups.bulkPut(snapshot.dexie.backups);
        }
        if (snapshot.dexie.syncQueue.length) {
          await this.db.syncQueue.bulkPut(snapshot.dexie.syncQueue);
        }
        if (snapshot.dexie.encryptionKeys.length) {
          await this.db.encryptionKeys.bulkPut(snapshot.dexie.encryptionKeys);
        }
      });
  }
}
