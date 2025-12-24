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
    return this.db.transactions.filter(t => !t.deleted).toArray();
  }

  // ...

  // Accounts
  getAccounts(): Promise<AccountEntity[]> {
    return this.db.accounts.filter(a => !a.deleted).toArray();
  }

  // ...

  // Debts
  getDebts(): Promise<DebtEntity[]> {
    return this.db.debts.filter(d => !d.deleted).toArray();
  }

  // ...

  getAllDebtTransactions(): Promise<DebtTransactionEntity[]> {
    return this.db.debtTransactions.filter(t => !t.deleted).toArray();
  }

  // ...

  // Meters (V1)
  getMeterReadings(): Promise<MeterReadingEntity[]> {
    return this.db.meters.filter(m => !m.deleted).toArray();
  }

  // ...

  // Objects (Residences)
  getMeterObjects(): Promise<MeterObjectEntity[]> {
    return this.db.meterObjects.filter(o => !o.deleted).toArray();
  }

  // ...

  // Resources (Counters)
  getMeterResources(): Promise<MeterResourceEntity[]> {
    return this.db.meterResources.filter(r => !r.deleted).toArray();
  }

  // ...

  // Readings V2
  getMeterReadingsV2(): Promise<MeterReadingRecord[]> {
    return this.db.meterReadings.filter(r => !r.deleted).toArray();
  }

  // ...

  // Tariffs
  getTariffs(): Promise<TariffEntity[]> {
    return this.db.tariffs.filter(t => !t.deleted).toArray();
  }

  // ...

  // Categories
  getCategories(): Promise<CategoryEntity[]> {
    return this.db.categories.filter(c => !c.deleted).toArray();
  }

  // ...

  // Subscriptions
  getSubscriptions(): Promise<SubscriptionEntity[]> {
    return this.db.subscriptions.filter(s => !s.deleted).toArray();
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
