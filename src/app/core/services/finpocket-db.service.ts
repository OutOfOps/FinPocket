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

export interface DebtEntity {
  id?: number;
  contact: string;
  direction: 'owed' | 'lent';
  amount: number;
  currency: string;
  dueDate?: string;
  status: 'open' | 'closed' | 'overdue';
  note?: string;
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
export class FinPocketDatabase extends Dexie {
  transactions!: Table<TransactionEntity, number>;
  debts!: Table<DebtEntity, number>;
  meters!: Table<MeterReadingEntity, number>;
  syncQueue!: Table<SyncQueueEntity, number>;

  constructor() {
    super('FinPocket');

    this.version(1).stores({
      transactions:
        '++id, occurredAt, type, account, category, currency',
      debts: '++id, contact, direction, status, dueDate',
      meters: '++id, meterType, place, recordedAt',
      syncQueue: '++id, entityType, action, createdAt',
    });

    this.transactions = this.table('transactions');
    this.debts = this.table('debts');
    this.meters = this.table('meters');
    this.syncQueue = this.table('syncQueue');
  }
}
