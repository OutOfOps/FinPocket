import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { CurrencyService } from '../../core/services/currency.service';
import { DebtEntity, DebtTransactionEntity } from '../../core/services/finpocket-db.service';

export type DebtKind = 'credit' | 'deposit' | 'loan' | 'lend';
export type DebtStatus = 'active' | 'paid' | 'overdue';

export interface DebtListItem {
  id: number;
  name: string;
  kind: DebtKind;
  kindLabel: string;
  status: DebtStatus;
  statusLabel: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  dueDate?: string;
  participants: string[];
  note?: string;
}

const KIND_LABELS: Record<DebtKind, string> = {
  credit: 'Кредит',
  deposit: 'Депозит',
  loan: 'Займ',
  lend: 'Даю в займы',
};

const STATUS_LABELS: Record<DebtStatus, string> = {
  active: 'В процессе',
  paid: 'Закрыт',
  overdue: 'Просрочен',
};

@Injectable({ providedIn: 'root' })
export class DebtsStore {
  private readonly storage = inject(StorageService);
  private readonly currencyService = inject(CurrencyService);

  private readonly debtsSignal = signal<DebtEntity[]>([]);
  private readonly transactionsSignal = signal<DebtTransactionEntity[]>([]);

  readonly debts = computed(() => this.debtsSignal());
  readonly transactions = computed(() => this.transactionsSignal());

  readonly listItems = computed<DebtListItem[]>(() => {
    const txMap = new Map<number, DebtTransactionEntity[]>();
    this.transactionsSignal().forEach(tx => {
      const list = txMap.get(tx.debtId) || [];
      list.push(tx);
      txMap.set(tx.debtId, list);
    });

    return [...this.debtsSignal()]
      .sort((a, b) => this.sortByDueDate(a.dueDate, b.dueDate))
      .map((debt) => {
        const debtTxs = txMap.get(debt.id!) || [];
        let currentAmount = debt.amount;
        debtTxs.forEach(tx => {
          if (tx.type === 'payment') currentAmount -= tx.amount;
          else if (tx.type === 'charge') currentAmount += tx.amount;
        });

        const normalizedCurrency = this.currencyService.normalizeCode(debt.currency);
        const convertedAmount = this.currencyService.convertToDefault(
          Math.abs(currentAmount),
          normalizedCurrency
        );
        const kind = debt.kind ?? 'loan';

        const kindLabel = Object.hasOwn(KIND_LABELS, kind)
          ? KIND_LABELS[kind]
          : KIND_LABELS.loan;

        const statusLabel = Object.hasOwn(STATUS_LABELS, debt.status)
          ? STATUS_LABELS[debt.status]
          : 'Неизвестно';

        return {
          id: debt.id ?? 0,
          name: debt.contact,
          kind,
          kindLabel,
          status: debt.status,
          statusLabel,
          amount: currentAmount,
          currency: normalizedCurrency,
          convertedAmount,
          dueDate: debt.dueDate,
          participants: debt.participants ?? [],
          note: debt.note,
        } satisfies DebtListItem;
      });
  });

  readonly totals = computed(() => {
    const defaultCurrency = this.currencyService.getDefaultCurrencyCode();
    const debts = this.listItems();

    const owed = debts
      .filter((debt) => debt.kind === 'credit' || debt.kind === 'loan')
      .reduce((sum, debt) => sum + debt.convertedAmount, 0);

    const lent = debts
      .filter((debt) => debt.kind === 'deposit' || debt.kind === 'lend')
      .reduce((sum, debt) => sum + debt.convertedAmount, 0);

    return {
      defaultCurrency,
      owed,
      lent,
      net: lent - owed,
    };
  });

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const [debts, transactions] = await Promise.all([
      this.storage.getDebts(),
      this.storage.getAllDebtTransactions(),
    ]);
    this.debtsSignal.set(debts);
    this.transactionsSignal.set(transactions);
  }

  async addDebt(debt: Omit<DebtEntity, 'id'>): Promise<void> {
    const id = await this.storage.addDebt(debt);
    this.debtsSignal.update((current) => [{ ...debt, id }, ...current]);
  }

  async updateDebt(id: number, changes: Partial<DebtEntity>): Promise<void> {
    await this.storage.updateDebt(id, changes);
    this.debtsSignal.update((current) =>
      current.map((debt) => (debt.id === id ? { ...debt, ...changes } : debt))
    );
  }

  async removeDebt(id: number): Promise<void> {
    await this.storage.deleteDebt(id);
    this.debtsSignal.update((current) => current.filter((debt) => debt.id !== id));
    this.transactionsSignal.update((current) => current.filter((tx) => tx.debtId !== id));
  }

  getDebt(id: number): DebtEntity | undefined {
    return this.debtsSignal().find((debt) => debt.id === id);
  }

  async getDebtTransactions(debtId: number): Promise<DebtTransactionEntity[]> {
    return this.transactionsSignal().filter((tx) => tx.debtId === debtId);
  }

  async addDebtTransaction(
    debtId: number,
    transaction: Omit<DebtTransactionEntity, 'id' | 'debtId'>
  ): Promise<void> {
    const fullTx: DebtTransactionEntity = {
      ...transaction,
      debtId,
    };
    const id = await this.storage.addDebtTransaction(fullTx);
    this.transactionsSignal.update((current) => [{ ...fullTx, id }, ...current]);
  }

  async updateDebtTransaction(
    id: number,
    changes: Partial<DebtTransactionEntity>
  ): Promise<void> {
    await this.storage.updateDebtTransaction(id, changes);
    this.transactionsSignal.update((current) =>
      current.map((tx) => (tx.id === id ? { ...tx, ...changes } : tx))
    );
  }

  async removeDebtTransaction(id: number): Promise<void> {
    await this.storage.deleteDebtTransaction(id);
    this.transactionsSignal.update((current) => current.filter((tx) => tx.id !== id));
  }

  kindLabel(kind: DebtKind): string {
    if (Object.hasOwn(KIND_LABELS, kind)) {
      return KIND_LABELS[kind];
    }
    return KIND_LABELS.loan; // fallback для неподдержанного значения
  }

  statusLabel(status: DebtStatus): string {
    if (Object.hasOwn(STATUS_LABELS, status)) {
      return STATUS_LABELS[status];
    }
    return 'Неизвестно';
  }

  private sortByDueDate(left?: string, right?: string): number {
    if (!left && !right) {
      return 0;
    }

    if (!left) {
      return 1;
    }

    if (!right) {
      return -1;
    }

    return new Date(left).getTime() - new Date(right).getTime();
  }
}
