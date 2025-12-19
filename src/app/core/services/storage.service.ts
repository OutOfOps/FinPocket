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
    return this.db.transactions.toArray();
  }

  getTransaction(id: number): Promise<TransactionEntity | undefined> {
    return this.db.transactions.get(id);
  }

  addTransaction(transaction: TransactionEntity): Promise<number> {
    return this.db.transactions.add(transaction);
  }

  updateTransaction(
    id: number,
    changes: Partial<TransactionEntity>
  ): Promise<number> {
    return this.db.transactions.update(id, changes);
  }

  deleteTransaction(id: number): Promise<void> {
    return this.db.transactions.delete(id);
  }

  // Accounts
  getAccounts(): Promise<AccountEntity[]> {
    return this.db.accounts.toArray();
  }

  getAccount(id: number): Promise<AccountEntity | undefined> {
    return this.db.accounts.get(id);
  }

  addAccount(account: AccountEntity): Promise<number> {
    return this.db.accounts.add(account);
  }

  updateAccount(id: number, changes: Partial<AccountEntity>): Promise<number> {
    return this.db.accounts.update(id, changes);
  }

  deleteAccount(id: number): Promise<void> {
    return this.db.accounts.delete(id);
  }

  // Debts
  getDebts(): Promise<DebtEntity[]> {
    return this.db.debts.toArray();
  }

  getDebt(id: number): Promise<DebtEntity | undefined> {
    return this.db.debts.get(id);
  }

  addDebt(debt: DebtEntity): Promise<number> {
    return this.db.debts.add(debt);
  }

  updateDebt(id: number, changes: Partial<DebtEntity>): Promise<number> {
    return this.db.debts.update(id, changes);
  }

  deleteDebt(id: number): Promise<void> {
    return this.db.debts.delete(id);
  }

  // Debt Transactions
  getDebtTransactions(debtId: number): Promise<DebtTransactionEntity[]> {
    return this.db.debtTransactions
      .where('debtId')
      .equals(debtId)
      .sortBy('createdAt');
  }

  getAllDebtTransactions(): Promise<DebtTransactionEntity[]> {
    return this.db.debtTransactions.toArray();
  }

  addDebtTransaction(transaction: DebtTransactionEntity): Promise<number> {
    return this.db.debtTransactions.add(transaction);
  }

  updateDebtTransaction(
    id: number,
    changes: Partial<DebtTransactionEntity>
  ): Promise<number> {
    return this.db.debtTransactions.update(id, changes);
  }

  deleteDebtTransaction(id: number): Promise<void> {
    return this.db.debtTransactions.delete(id);
  }

  // Meters
  getMeterReadings(): Promise<MeterReadingEntity[]> {
    return this.db.meters.toArray();
  }

  getMeterReading(id: number): Promise<MeterReadingEntity | undefined> {
    return this.db.meters.get(id);
  }

  addMeterReading(reading: MeterReadingEntity): Promise<number> {
    return this.db.meters.add(reading);
  }

  updateMeterReading(
    id: number,
    changes: Partial<MeterReadingEntity>
  ): Promise<number> {
    return this.db.meters.update(id, changes);
  }

  deleteMeterReading(id: number): Promise<void> {
    return this.db.meters.delete(id);
  }

  // --- Meters Module V2 ---

  // Objects (Residences)
  getMeterObjects(): Promise<MeterObjectEntity[]> {
    return this.db.meterObjects.toArray();
  }

  addMeterObject(item: MeterObjectEntity): Promise<string> {
    return this.db.meterObjects.add(item);
  }

  updateMeterObject(id: string, changes: Partial<MeterObjectEntity>): Promise<number> {
    return this.db.meterObjects.update(id, changes);
  }

  deleteMeterObject(id: string): Promise<void> {
    return this.db.meterObjects.delete(id);
  }

  // Resources (Counters)
  getMeterResources(): Promise<MeterResourceEntity[]> {
    return this.db.meterResources.toArray();
  }

  addMeterResource(item: MeterResourceEntity): Promise<string> {
    return this.db.meterResources.add(item);
  }

  updateMeterResource(id: string, changes: Partial<MeterResourceEntity>): Promise<number> {
    return this.db.meterResources.update(id, changes);
  }

  deleteMeterResource(id: string): Promise<void> {
    return this.db.meterResources.delete(id);
  }

  // Readings V2
  getMeterReadingsV2(): Promise<MeterReadingRecord[]> {
    return this.db.meterReadings.toArray();
  }

  addMeterReadingV2(item: MeterReadingRecord): Promise<string> {
    return this.db.meterReadings.add(item);
  }

  updateMeterReadingV2(id: string, changes: Partial<MeterReadingRecord>): Promise<number> {
    return this.db.meterReadings.update(id, changes);
  }

  deleteMeterReadingV2(id: string): Promise<void> {
    return this.db.meterReadings.delete(id);
  }

  // Tariffs
  getTariffs(): Promise<TariffEntity[]> {
    return this.db.tariffs.toArray();
  }

  addTariff(item: TariffEntity): Promise<string> {
    return this.db.tariffs.add(item);
  }

  updateTariff(id: string, changes: Partial<TariffEntity>): Promise<number> {
    return this.db.tariffs.update(id, changes);
  }

  deleteTariff(id: string): Promise<void> {
    return this.db.tariffs.delete(id);
  }

  // Categories
  getCategories(): Promise<CategoryEntity[]> {
    return this.db.categories.toArray();
  }

  getCategory(id: number): Promise<CategoryEntity | undefined> {
    return this.db.categories.get(id);
  }

  addCategory(category: CategoryEntity): Promise<number> {
    return this.db.categories.add(category);
  }

  updateCategory(
    id: number,
    changes: Partial<CategoryEntity>
  ): Promise<number> {
    return this.db.categories.update(id, changes);
  }

  deleteCategory(id: number): Promise<void> {
    return this.db.categories.delete(id);
  }

  // Subscriptions
  getSubscriptions(): Promise<SubscriptionEntity[]> {
    return this.db.subscriptions.toArray();
  }

  addSubscription(subscription: SubscriptionEntity): Promise<number> {
    return this.db.subscriptions.add(subscription);
  }

  updateSubscription(id: number, changes: Partial<SubscriptionEntity>): Promise<number> {
    return this.db.subscriptions.update(id, changes);
  }

  deleteSubscription(id: number): Promise<void> {
    return this.db.subscriptions.delete(id);
  }

  // Backups
  getBackups(): Promise<BackupEntity[]> {
    return this.db.backups.toArray();
  }

  getBackup(id: number): Promise<BackupEntity | undefined> {
    return this.db.backups.get(id);
  }

  addBackup(backup: BackupEntity): Promise<number> {
    return this.db.backups.add(backup);
  }

  updateBackup(id: number, changes: Partial<BackupEntity>): Promise<number> {
    return this.db.backups.update(id, changes);
  }

  deleteBackup(id: number): Promise<void> {
    return this.db.backups.delete(id);
  }
}
