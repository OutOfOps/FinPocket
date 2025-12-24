import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface TransactionEntity {
  id?: number;
  uid?: string; // Global identifier for sync
  type: 'income' | 'expense' | 'transfer';
  account: string;
  category: string;
  amount: number;
  currency: string;
  occurredAt: string;
  updatedAt?: string; // For conflict resolution
  note?: string;
  deleted?: boolean; // For soft delete sync
}

export interface AccountEntity {
  id?: number;
  uid?: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
  deleted?: boolean;
}

export interface DebtEntity {
  id?: number;
  uid?: string;
  contact: string;
  kind: 'credit' | 'deposit' | 'loan' | 'lend';
  direction: 'owed' | 'lent';
  amount: number;
  currency: string;
  dueDate?: string;
  status: 'active' | 'paid' | 'overdue';
  participants: string[];
  note?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface DebtTransactionEntity {
  id?: number;
  uid?: string;
  debtId: number;
  type: 'payment' | 'charge' | 'note';
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface MeterReadingEntity {
  id?: number;
  uid?: string;
  meterType: 'water' | 'gas' | 'electricity' | 'heat';
  place: string;
  value: number;
  unit: string;
  tariffName?: string;
  recordedAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface MeterObjectEntity {
  id: string; // UUID
  name: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface MeterResourceEntity {
  id: string; // UUID
  objectId: string;
  type: string;
  name: string;
  unit: string;
  pricingModel: 'per_unit' | 'fixed';
  zones: { id: string; name: string }[];
  initialValues?: { zoneId: string; value: number }[];
  fixedAmount?: number;
  fixedCurrency?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface MeterReadingRecord {
  id: string; // UUID
  objectId: string;
  resourceId: string;
  submittedAt: string;
  values: { zoneId: string; value: number }[];
  updatedAt?: string;
  deleted?: boolean;
}

export interface TariffEntity {
  id: string; // UUID
  resourceId: string;
  effectiveFrom: string;
  price: number;
  currency: string;
  zoneId?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface CategoryEntity {
  id?: number;
  uid?: string;
  name: string;
  type: 'income' | 'expense' | 'transfer' | 'meter' | 'debt';
  color?: string;
  icon?: string;
  archived?: boolean;
  updatedAt?: string;
  deleted?: boolean;
}

export interface SubscriptionEntity {
  id?: number;
  uid?: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  active: boolean;
  paymentDay?: number; // 1-31
  note?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface BackupEntity {
  id?: number;
  createdAt: string;
  size: number;
  checksum: string;
  payload: unknown;
}

export interface SyncQueueEntity {
  id?: number;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: string;
  syncedAt?: string;
  retryCount?: number;
  nextRetryAt?: string;
}

export interface EncryptionKeyEntity {
  id?: number;
  keyName: string;
  encryptedKey: string; // encrypted with master passphrase
  salt: string;
  iv: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FinPocketDB extends Dexie {
  transactions!: Table<TransactionEntity, number>;
  accounts!: Table<AccountEntity, number>;
  debts!: Table<DebtEntity, number>;
  debtTransactions!: Table<DebtTransactionEntity, number>;
  meters!: Table<MeterReadingEntity, number>;
  categories!: Table<CategoryEntity, number>;
  backups!: Table<BackupEntity, number>;
  syncQueue!: Table<SyncQueueEntity, number>;
  encryptionKeys!: Table<EncryptionKeyEntity, number>;

  meterObjects!: Table<MeterObjectEntity, string>;
  meterResources!: Table<MeterResourceEntity, string>;
  meterReadings!: Table<MeterReadingRecord, string>;
  tariffs!: Table<TariffEntity, string>;
  subscriptions!: Table<SubscriptionEntity, number>;

  constructor() {
    super('FinPocketDB');

    this.version(1).stores({
      transactions:
        '++id, occurredAt, type, account, category, currency',
      accounts: '++id, name, type, currency, archived',
      debts: '++id, contact, direction, status, dueDate',
      debtTransactions: '++id, debtId, createdAt',
      meters: '++id, meterType, place, recordedAt',
      categories: '++id, name, type, archived',
      backups: '++id, createdAt, checksum',
      syncQueue: '++id, entityType, action, createdAt, syncedAt, nextRetryAt',
    });

    this.version(2)
      .stores({
        debts: '++id, contact, kind, direction, status, dueDate, createdAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('debts')
          .toCollection()
          .modify((debt: unknown) => {
            const debtRecord = debt as any;
            if (!debtRecord.kind) {
              debtRecord.kind = 'loan';
            }

            if (!debtRecord.participants) {
              debtRecord.participants = [];
            }

            if (!debtRecord.createdAt) {
              debtRecord.createdAt = new Date().toISOString();
            }

            switch (debtRecord.status) {
              case 'open':
                debtRecord.status = 'active';
                break;
              case 'closed':
                debtRecord.status = 'paid';
                break;
            }
          })
      );

    this.version(3).stores({
      encryptionKeys: '++id, keyName, createdAt',
    });

    // Version 4 removed as it was a duplicate definition of syncQueue from Version 1

    this.transactions = this.table('transactions');
    this.accounts = this.table('accounts');
    this.debts = this.table('debts');
    this.debtTransactions = this.table('debtTransactions');
    this.meters = this.table('meters');
    this.categories = this.table('categories');
    this.backups = this.table('backups');
    this.syncQueue = this.table('syncQueue');
    this.encryptionKeys = this.table('encryptionKeys');

    // Version 5: New Meters Module Structure
    this.version(5).stores({
      meterObjects: 'id',
      meterResources: 'id, objectId',
      meterReadings: 'id, resourceId, objectId, submittedAt',
      tariffs: 'id, resourceId',
    });

    this.meterObjects = this.table('meterObjects');
    this.meterResources = this.table('meterResources');
    this.meterReadings = this.table('meterReadings');
    this.tariffs = this.table('tariffs');

    // Version 6: Subscriptions
    this.version(6).stores({
      subscriptions: '++id, name, active, category',
    });

    this.subscriptions = this.table('subscriptions');

    // Version 7: Sync Enhancements (UIDs & UpdatedAt)
    this.version(7).stores({
      transactions: '++id, uid, occurredAt, type, account, category, currency',
      accounts: '++id, uid, name, type, currency, archived',
      debts: '++id, uid, contact, direction, status, dueDate',
      debtTransactions: '++id, uid, debtId, createdAt',
      meters: '++id, uid, meterType, place, recordedAt',
      categories: '++id, uid, name, type, archived',
      subscriptions: '++id, uid, name, active, category',
    }).upgrade(async (tx) => {
      // Background migration to add UIDs to existing records
      const tables = ['transactions', 'accounts', 'debts', 'debtTransactions', 'meters', 'categories', 'subscriptions'];
      for (const tableName of tables) {
        await tx.table(tableName).toCollection().modify((record: any) => {
          if (!record.uid) record.uid = crypto.randomUUID();
          if (!record.updatedAt) record.updatedAt = new Date().toISOString();
        });
      }
    });

    // Version 8: Indexing for Sync (deleted flag & updatedAt)
    this.version(8).stores({
      transactions: '++id, uid, occurredAt, type, account, category, currency, deleted, updatedAt',
      accounts: '++id, uid, name, type, currency, archived, deleted, updatedAt',
      debts: '++id, uid, contact, direction, status, dueDate, deleted, updatedAt',
      debtTransactions: '++id, uid, debtId, createdAt, deleted, updatedAt',
      meters: '++id, uid, meterType, place, recordedAt, deleted, updatedAt',
      categories: '++id, uid, name, type, archived, deleted, updatedAt',
      subscriptions: '++id, uid, name, active, category, deleted, updatedAt',
      // Meters V2
      meterObjects: 'id, deleted, updatedAt',
      meterResources: 'id, objectId, deleted, updatedAt',
      meterReadings: 'id, resourceId, objectId, submittedAt, deleted, updatedAt',
      tariffs: 'id, resourceId, deleted, updatedAt',
    });

    this.transactions = this.table('transactions');
    this.accounts = this.table('accounts');
    this.debts = this.table('debts');
    this.debtTransactions = this.table('debtTransactions');
    this.meters = this.table('meters');
    this.categories = this.table('categories');
    this.subscriptions = this.table('subscriptions');
    this.meterObjects = this.table('meterObjects');
    this.meterResources = this.table('meterResources');
    this.meterReadings = this.table('meterReadings');
    this.tariffs = this.table('tariffs');
  }
}
