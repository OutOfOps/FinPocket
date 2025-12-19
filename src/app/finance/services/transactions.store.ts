import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { TransactionEntity } from '../../core/services/finpocket-db.service';
import { CurrencyService } from '../../core/services/currency.service';
import { OperationAccountsService } from './operation-accounts.service';

export interface FinanceListItem {
  id: number;
  description: string;
  category: string;
  account: string;
  amount: number;
  currency: string;
  occurredAt: string;
  type: TransactionEntity['type'];
  convertedAmount: number;
}

interface MonthlyTotals {
  income: number;
  expenses: number;
  net: number;
}

interface CategoryTotal {
  category: string;
  amount: number;
}

@Injectable({ providedIn: 'root' })
export class TransactionsStore {
  private readonly storage = inject(StorageService);
  private readonly currencyService = inject(CurrencyService);

  private readonly transactionsSignal = signal<TransactionEntity[]>([]);

  readonly transactions = computed(() => this.transactionsSignal());

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  readonly listItems = computed<FinanceListItem[]>(() =>
    [...this.transactionsSignal()]
      .sort((a, b) => this.compareByOccurredAt(a.occurredAt, b.occurredAt))
      .map((transaction) => ({
        id: transaction.id ?? 0,
        description:
          transaction.note?.trim() ||
          (transaction.type === 'income'
            ? 'Доход'
            : transaction.type === 'expense'
              ? 'Расход'
              : 'Перевод'),
        category: transaction.category,
        account: transaction.account,
        amount: this.applySign(transaction),
        currency: this.currencyService.normalizeCode(transaction.currency),
        occurredAt: transaction.occurredAt,
        type: transaction.type,
        convertedAmount: this.toDefaultSigned(transaction),
      }))
  );

  private readonly accountsService = inject(OperationAccountsService);

  readonly totalIncome = computed(() =>
    this.transactionsSignal()
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + this.convertToDefault(transaction), 0)
  );

  readonly totalExpenses = computed(() =>
    this.transactionsSignal()
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + this.convertToDefault(transaction), 0)
  );

  // Balance = (Income - Expenses) + (Sum of Initial Balances of All Accounts)
  readonly accountsInitialBalance = computed(() =>
    this.accountsService.accounts()
      .filter(acc => acc.includeInTotal !== false)
      .reduce((sum: number, acc) =>
        sum + this.currencyService.convertToDefault(acc.initialBalance, acc.currencyCode), 0
      )
  );

  readonly balance = computed(() =>
    (this.totalIncome() - this.totalExpenses()) + this.accountsInitialBalance()
  );

  readonly currentMonthTotals = computed(() => this.calculateMonthlyTotals(0));
  readonly previousMonthTotals = computed(() => this.calculateMonthlyTotals(1));

  readonly currentMonthExpensesByCategory = computed<CategoryTotal[]>(() => {
    const totals = new Map<string, number>();
    const monthTransactions = this.getTransactionsForMonth(0).filter(
      (transaction) => transaction.type === 'expense'
    );

    for (const transaction of monthTransactions) {
      const current = totals.get(transaction.category) ?? 0;
      totals.set(transaction.category, current + this.convertToDefault(transaction));
    }

    return [...totals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  });

  readonly expensesByCategorySignal = computed(() => {
    return this.currentMonthExpensesByCategory().map((item) => ({
      name: item.category,
      value: item.amount,
    }));
  });

  readonly monthlyHistorySignal = computed(() => {
    const history = [];
    for (let i = 5; i >= 0; i--) {
      const totals = this.calculateMonthlyTotals(i);
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const name = date.toLocaleDateString('ru-RU', { month: 'short' });

      history.push({
        name,
        series: [
          { name: 'Доход', value: totals.income },
          { name: 'Расход', value: totals.expenses },
        ],
      });
    }
    return history;
  });

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const transactions = await this.storage.getTransactions();
    this.transactionsSignal.set(transactions);
  }

  async addTransaction(transaction: Omit<TransactionEntity, 'id'>): Promise<void> {
    const id = await this.storage.addTransaction(transaction);
    this.transactionsSignal.update((transactions) => [
      { ...transaction, id },
      ...transactions,
    ]);
  }

  async updateTransaction(id: number, changes: Partial<TransactionEntity>): Promise<void> {
    await this.storage.updateTransaction(id, changes);
    this.transactionsSignal.update((transactions) =>
      transactions.map((t) => (t.id === id ? { ...t, ...changes } : t))
    );
  }

  async deleteTransaction(id: number): Promise<void> {
    await this.storage.deleteTransaction(id);
    this.transactionsSignal.update((transactions) =>
      transactions.filter((t) => t.id !== id)
    );
  }

  trend(current: number, previous: number): 'up' | 'down' | 'stable' {
    if (previous === 0 && current === 0) {
      return 'stable';
    }

    if (previous === 0) {
      return current > 0 ? 'up' : 'stable';
    }

    if (current === previous) {
      return 'stable';
    }

    return current > previous ? 'up' : 'down';
  }

  describeChange(current: number, previous: number, unit: string, invert = false): string {
    if (current === 0 && previous === 0) {
      return `Нет данных о ${unit} за последние два месяца`;
    }

    if (previous === 0) {
      return 'В прошлом месяце данных не было';
    }

    const delta = ((current - previous) / previous) * 100;
    const adjustedDelta = invert ? -delta : delta;

    if (adjustedDelta === 0) {
      return `Без изменений по сравнению с прошлым месяцем`;
    }

    const direction = adjustedDelta > 0 ? 'больше' : 'меньше';
    const formattedDelta = Math.abs(adjustedDelta).toFixed(1).replace('.0', '');

    return `На ${formattedDelta}% ${direction}, чем в прошлом месяце`;
  }

  private calculateMonthlyTotals(offset: number): MonthlyTotals {
    const transactions = this.getTransactionsForMonth(offset);

    const income = transactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + this.convertToDefault(transaction), 0);

    const expenses = transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + this.convertToDefault(transaction), 0);

    return {
      income,
      expenses,
      net: income - expenses,
    };
  }

  private getTransactionsForMonth(offset: number): TransactionEntity[] {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const end = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.transactionsSignal().filter((transaction) => {
      const occurredAt = this.parseDate(transaction.occurredAt);
      if (!occurredAt) {
        return false;
      }

      return occurredAt >= start && occurredAt <= end;
    });
  }

  private applySign(transaction: TransactionEntity): number {
    const amount = Math.abs(transaction.amount);

    switch (transaction.type) {
      case 'expense':
        return -amount;
      case 'income':
        return amount;
      default:
        return 0;
    }
  }

  private convertToDefault(transaction: TransactionEntity): number {
    return this.currencyService.convertToDefault(
      Math.abs(transaction.amount),
      this.currencyService.normalizeCode(transaction.currency)
    );
  }

  private toDefaultSigned(transaction: TransactionEntity): number {
    const converted = this.convertToDefault(transaction);

    switch (transaction.type) {
      case 'expense':
        return -converted;
      case 'income':
        return converted;
      default:
        return 0;
    }
  }

  private compareByOccurredAt(left: string, right: string): number {
    const leftDate = this.parseDate(left);
    const rightDate = this.parseDate(right);

    if (leftDate && rightDate) {
      return rightDate.getTime() - leftDate.getTime();
    }

    if (leftDate && !rightDate) {
      return -1;
    }

    if (!leftDate && rightDate) {
      return 1;
    }

    return 0;
  }

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
