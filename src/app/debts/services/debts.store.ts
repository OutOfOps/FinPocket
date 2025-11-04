import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { CurrencyService } from '../../core/services/currency.service';
import { DebtEntity } from '../../core/services/finpocket-db.service';

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

  readonly debts = computed(() => this.debtsSignal());

  readonly listItems = computed<DebtListItem[]>(() =>
    [...this.debtsSignal()]
      .sort((a, b) => this.sortByDueDate(a.dueDate, b.dueDate))
      .map((debt) => {
        const normalizedCurrency = this.currencyService.normalizeCode(debt.currency);
        const convertedAmount = this.currencyService.convertToDefault(
          Math.abs(debt.amount),
          normalizedCurrency
        );
        const kind = debt.kind ?? 'loan';

        return {
          id: debt.id ?? 0,
          name: debt.contact,
          kind,
          kindLabel: Object.hasOwn(KIND_LABELS, kind)
            ? KIND_LABELS[kind]
            : KIND_LABELS.loan,
          status: debt.status,
          statusLabel: Object.hasOwn(STATUS_LABELS, debt.status)
            ? STATUS_LABELS[debt.status]
            : 'Неизвестно',
          amount: debt.amount,
          currency: normalizedCurrency,
          convertedAmount,
          dueDate: debt.dueDate,
          participants: debt.participants ?? [],
          note: debt.note,
        } satisfies DebtListItem;
      })
  );

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
    const debts = await this.storage.getDebts();
    this.debtsSignal.set(debts);
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
  }

  getDebt(id: number): DebtEntity | undefined {
    return this.debtsSignal().find((debt) => debt.id === id);
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
