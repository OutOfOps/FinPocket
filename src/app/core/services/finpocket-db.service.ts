import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

export interface TransactionEntity {
  id?: number;
  type: 'income' | 'expense' | 'transfer';
  account: string;
  category: string;
  amount: number;
  currency: string;
  occurredAt: string;
  note?: string;
}

export interface AccountEntity {
  id?: number;
  name: string;
  type: string;
  currency: string;
  balance: number;
  createdAt: string;
  archived?: boolean;
}

export interface DebtEntity {
  id?: number;
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
}

export interface DebtTransactionEntity {
  id?: number;
  debtId: number;
  type: 'payment' | 'charge' | 'note';
  amount: number;
  note?: string;
  createdAt: string;
}

export interface MeterReadingEntity {
  id?: number;
  meterType: 'water' | 'gas' | 'electricity' | 'heat';
  place: string;
  value: number;
  unit: string;
  tariffName?: string;
  recordedAt: string;
}

export interface MeterObjectEntity {
  id: string;
  name: string;
}

export interface MeterResourceEntity {
  id: string;
  objectId: string;
  type: string;
  name: string;
  unit: string;
  pricingModel: 'per_unit' | 'fixed';
  zones: { id: string; name: string }[];
  fixedAmount?: number;
  fixedCurrency?: string;
}

export interface MeterReadingRecord {
  id: string;
  objectId: string;
  resourceId: string;
  submittedAt: string;
  values: { zoneId: string; value: number }[];
}

export interface TariffEntity {
  id: string;
  resourceId: string;
  effectiveFrom: string;
  price: number;
  currency: string;
  zoneId?: string;
}

export interface CategoryEntity {
  id?: number;
  name: string;
  type: 'income' | 'expense' | 'transfer' | 'meter' | 'debt';
  color?: string;
  icon?: string;
  archived?: boolean;
}

export interface SubscriptionEntity {
  id?: number;
  name: string;
  amount: number;
  currency: string;
  category: string;
  active: boolean;
  paymentDay?: number; // 1-31
  note?: string;
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
  }
}
