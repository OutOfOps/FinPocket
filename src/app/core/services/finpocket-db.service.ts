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

export interface CategoryEntity {
  id?: number;
  name: string;
  type: 'income' | 'expense' | 'transfer' | 'meter' | 'debt';
  color?: string;
  icon?: string;
  archived?: boolean;
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
      syncQueue: '++id, entityType, action, createdAt',
    });

    this.version(2)
      .stores({
        debts: '++id, contact, kind, direction, status, dueDate, createdAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('debts')
          .toCollection()
          .modify((debt: any) => {
            if (!debt.kind) {
              debt.kind = 'loan';
            }

            if (!debt.participants) {
              debt.participants = [];
            }

            if (!debt.createdAt) {
              debt.createdAt = new Date().toISOString();
            }

            switch (debt.status) {
              case 'open':
                debt.status = 'active';
                break;
              case 'closed':
                debt.status = 'paid';
                break;
            }
          })
      );

    this.transactions = this.table('transactions');
    this.accounts = this.table('accounts');
    this.debts = this.table('debts');
    this.debtTransactions = this.table('debtTransactions');
    this.meters = this.table('meters');
    this.categories = this.table('categories');
    this.backups = this.table('backups');
    this.syncQueue = this.table('syncQueue');
  }
}
