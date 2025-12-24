import { Injectable } from '@angular/core';
import {
  AccountEntity,
  BackupEntity,
  CategoryEntity,
  DebtEntity,
  DebtTransactionEntity,
  FinPocketDB,
  MeterReadingEntity,
  TransactionEntity,
  MeterObjectEntity,
  MeterResourceEntity,
  MeterReadingRecord,
  TariffEntity,
  SubscriptionEntity,
} from './finpocket-db.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(private readonly db: FinPocketDB) { }

  // Transactions
  getTransactions(): Promise<TransactionEntity[]> {
    return this.db.transactions.where('deleted').notEqual(1).toArray();
  }

  getTransaction(id: number): Promise<TransactionEntity | undefined> {
    return this.db.transactions.get(id);
  }

  addTransaction(transaction: TransactionEntity): Promise<number> {
    return this.db.transactions.add(this.prepareEntity(transaction));
  }

  updateTransaction(id: number, changes: Partial<TransactionEntity>): Promise<number> {
    return this.db.transactions.update(id, this.prepareUpdate(changes));
  }

  deleteTransaction(id: number): Promise<number> {
    return this.db.transactions.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Accounts
  getAccounts(): Promise<AccountEntity[]> {
    return this.db.accounts.where('deleted').notEqual(1).toArray();
  }

  getAccount(id: number): Promise<AccountEntity | undefined> {
    return this.db.accounts.get(id);
  }

  addAccount(account: AccountEntity): Promise<number> {
    return this.db.accounts.add(this.prepareEntity(account));
  }

  updateAccount(id: number, changes: Partial<AccountEntity>): Promise<number> {
    return this.db.accounts.update(id, this.prepareUpdate(changes));
  }

  deleteAccount(id: number): Promise<number> {
    return this.db.accounts.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Debts
  getDebts(): Promise<DebtEntity[]> {
    return this.db.debts.where('deleted').notEqual(1).toArray();
  }

  getDebt(id: number): Promise<DebtEntity | undefined> {
    return this.db.debts.get(id);
  }

  addDebt(debt: DebtEntity): Promise<number> {
    return this.db.debts.add(this.prepareEntity(debt));
  }

  updateDebt(id: number, changes: Partial<DebtEntity>): Promise<number> {
    return this.db.debts.update(id, this.prepareUpdate(changes));
  }

  deleteDebt(id: number): Promise<number> {
    return this.db.debts.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Debt Transactions
  getDebtTransactions(debtId: number): Promise<DebtTransactionEntity[]> {
    return this.db.debtTransactions
      .where('debtId').equals(debtId)
      .and(t => !t.deleted)
      .sortBy('createdAt');
  }

  getAllDebtTransactions(): Promise<DebtTransactionEntity[]> {
    return this.db.debtTransactions.where('deleted').notEqual(1).toArray();
  }

  addDebtTransaction(transaction: DebtTransactionEntity): Promise<number> {
    return this.db.debtTransactions.add(this.prepareEntity(transaction));
  }

  updateDebtTransaction(id: number, changes: Partial<DebtTransactionEntity>): Promise<number> {
    return this.db.debtTransactions.update(id, this.prepareUpdate(changes));
  }

  deleteDebtTransaction(id: number): Promise<number> {
    return this.db.debtTransactions.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Meters (V1)
  getMeterReadings(): Promise<MeterReadingEntity[]> {
    return this.db.meters.where('deleted').notEqual(1).toArray();
  }

  getMeterReading(id: number): Promise<MeterReadingEntity | undefined> {
    return this.db.meters.get(id);
  }

  addMeterReading(reading: MeterReadingEntity): Promise<number> {
    return this.db.meters.add(this.prepareEntity(reading));
  }

  updateMeterReading(id: number, changes: Partial<MeterReadingEntity>): Promise<number> {
    return this.db.meters.update(id, this.prepareUpdate(changes));
  }

  deleteMeterReading(id: number): Promise<number> {
    return this.db.meters.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // --- Meters Module V2 ---

  // Objects (Residences)
  getMeterObjects(): Promise<MeterObjectEntity[]> {
    return this.db.meterObjects.where('deleted').notEqual(1).toArray();
  }

  addMeterObject(item: MeterObjectEntity): Promise<string> {
    return this.db.meterObjects.add(this.prepareEntity(item));
  }

  updateMeterObject(id: string, changes: Partial<MeterObjectEntity>): Promise<number> {
    return this.db.meterObjects.update(id, this.prepareUpdate(changes));
  }

  deleteMeterObject(id: string): Promise<number> {
    return this.db.meterObjects.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Resources (Counters)
  getMeterResources(): Promise<MeterResourceEntity[]> {
    return this.db.meterResources.where('deleted').notEqual(1).toArray();
  }

  addMeterResource(item: MeterResourceEntity): Promise<string> {
    return this.db.meterResources.add(this.prepareEntity(item));
  }

  updateMeterResource(id: string, changes: Partial<MeterResourceEntity>): Promise<number> {
    return this.db.meterResources.update(id, this.prepareUpdate(changes));
  }

  deleteMeterResource(id: string): Promise<number> {
    return this.db.meterResources.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Readings V2
  getMeterReadingsV2(): Promise<MeterReadingRecord[]> {
    return this.db.meterReadings.where('deleted').notEqual(1).toArray();
  }

  addMeterReadingV2(item: MeterReadingRecord): Promise<string> {
    return this.db.meterReadings.add(item);
  }

  updateMeterReadingV2(id: string, changes: Partial<MeterReadingRecord>): Promise<number> {
    return this.db.meterReadings.update(id, this.prepareUpdate(changes));
  }

  deleteMeterReadingV2(id: string): Promise<number> {
    return this.db.meterReadings.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Tariffs
  getTariffs(): Promise<TariffEntity[]> {
    return this.db.tariffs.where('deleted').notEqual(1).toArray();
  }

  addTariff(item: TariffEntity): Promise<string> {
    return this.db.tariffs.add(item);
  }

  updateTariff(id: string, changes: Partial<TariffEntity>): Promise<number> {
    return this.db.tariffs.update(id, this.prepareUpdate(changes));
  }

  deleteTariff(id: string): Promise<number> {
    return this.db.tariffs.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Categories
  getCategories(): Promise<CategoryEntity[]> {
    return this.db.categories.where('deleted').notEqual(1).toArray();
  }

  getCategory(id: number): Promise<CategoryEntity | undefined> {
    return this.db.categories.get(id);
  }

  addCategory(category: CategoryEntity): Promise<number> {
    return this.db.categories.add(this.prepareEntity(category));
  }

  updateCategory(id: number, changes: Partial<CategoryEntity>): Promise<number> {
    return this.db.categories.update(id, this.prepareUpdate(changes));
  }

  deleteCategory(id: number): Promise<number> {
    return this.db.categories.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Subscriptions
  getSubscriptions(): Promise<SubscriptionEntity[]> {
    return this.db.subscriptions.where('deleted').notEqual(1).toArray();
  }

  addSubscription(subscription: SubscriptionEntity): Promise<number> {
    return this.db.subscriptions.add(this.prepareEntity(subscription));
  }

  updateSubscription(id: number, changes: Partial<SubscriptionEntity>): Promise<number> {
    return this.db.subscriptions.update(id, this.prepareUpdate(changes));
  }

  deleteSubscription(id: number): Promise<number> {
    return this.db.subscriptions.update(id, {
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
  }

  // Metadata Helpers
  private prepareEntity<T extends { uid?: string; updatedAt?: string }>(entity: T): T {
    return {
      ...entity,
      uid: entity.uid || crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };
  }

  private prepareUpdate<T extends { updatedAt?: string }>(changes: T): T {
    return {
      ...changes,
      updatedAt: new Date().toISOString(),
    };
  }

  // Backups & Other methods (hard delete for backups logs is fine)
  getBackups(): Promise<BackupEntity[]> { return this.db.backups.toArray(); }
  getBackup(id: number): Promise<BackupEntity | undefined> { return this.db.backups.get(id); }
  addBackup(backup: BackupEntity): Promise<number> { return this.db.backups.add(backup); }
  updateBackup(id: number, changes: Partial<BackupEntity>): Promise<number> { return this.db.backups.update(id, changes); }
  deleteBackup(id: number): Promise<void> { return this.db.backups.delete(id); }
}
