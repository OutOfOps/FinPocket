import { Injectable } from '@angular/core';
import {
  AccountEntity,
  BackupEntity,
  CategoryEntity,
  DebtEntity,
  FinPocketDB,
  MeterReadingEntity,
  TransactionEntity,
} from './finpocket-db.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(private readonly db: FinPocketDB) {}

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
