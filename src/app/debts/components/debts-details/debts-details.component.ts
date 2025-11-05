import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';
import { DebtsStore, DebtKind, DebtStatus } from '../../services/debts.store';
import { DebtEntity, DebtTransactionEntity } from '../../../core/services/finpocket-db.service';

interface TimelineEntry {
  id?: number;
  date: string;
  action: string;
  amount: number;
  note?: string;
}

@Component({
  selector: 'app-debts-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './debts-details.component.html',
  styleUrls: ['./debts-details.component.scss'],
})
export class DebtsDetailsComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly debtsStore = inject(DebtsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());
  
  readonly debtId = signal<number | undefined>(undefined);
  readonly debt = signal<DebtEntity | undefined>(undefined);
  readonly transactions = signal<DebtTransactionEntity[]>([]);
  readonly isEditing = signal(false);
  readonly isAddingPayment = signal(false);

  readonly editForm = signal<{
    contact: string;
    kind: DebtKind;
    amount: number;
    currency: string;
    dueDate: string;
    status: DebtStatus;
    participants: string[];
    note: string;
  }>({
    contact: '',
    kind: 'credit',
    amount: 0,
    currency: '',
    dueDate: '',
    status: 'active',
    participants: [],
    note: '',
  });

  readonly paymentForm = signal<{
    type: 'payment' | 'charge';
    amount: number;
    note: string;
  }>({
    type: 'payment',
    amount: 0,
    note: '',
  });

  readonly typeOptions: { value: DebtKind; label: string }[] = [
    { value: 'credit', label: 'Кредит' },
    { value: 'deposit', label: 'Депозит' },
    { value: 'loan', label: 'Займ' },
    { value: 'lend', label: 'Даю в займы' },
  ];

  readonly statusOptions: { value: DebtStatus; label: string }[] = [
    { value: 'active', label: 'В процессе' },
    { value: 'paid', label: 'Закрыт' },
    { value: 'overdue', label: 'Просрочен' },
  ];

  readonly timeline = computed<TimelineEntry[]>(() => {
    const debt = this.debt();
    const transactions = this.transactions();
    
    if (!debt) return [];

    const entries: TimelineEntry[] = [
      {
        date: debt.createdAt,
        action: this.getInitialActionLabel(debt.kind),
        amount: debt.amount,
      },
    ];

    transactions.forEach((tx) => {
      entries.push({
        id: tx.id,
        date: tx.createdAt,
        action: this.getTransactionActionLabel(tx.type),
        amount: tx.type === 'payment' ? -tx.amount : tx.amount,
        note: tx.note,
      });
    });

    return entries.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  readonly remainingBalance = computed(() => {
    const debt = this.debt();
    const transactions = this.transactions();
    
    if (!debt) return 0;

    let balance = debt.amount;
    
    transactions.forEach((tx) => {
      if (tx.type === 'payment') {
        balance -= tx.amount;
      } else if (tx.type === 'charge') {
        balance += tx.amount;
      }
    });

    return Math.max(0, balance);
  });

  constructor() {
    void this.loadDebt();
  }

  private async loadDebt(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      void this.router.navigate(['/debts/list']);
      return;
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      void this.router.navigate(['/debts/list']);
      return;
    }

    this.debtId.set(id);
    const debt = this.debtsStore.getDebt(id);
    
    if (!debt) {
      void this.router.navigate(['/debts/list']);
      return;
    }

    this.debt.set(debt);
    
    const transactions = await this.debtsStore.getDebtTransactions(id);
    this.transactions.set(transactions);
  }

  startEdit(): void {
    const debt = this.debt();
    if (!debt) return;

    this.editForm.set({
      contact: debt.contact,
      kind: debt.kind,
      amount: debt.amount,
      currency: debt.currency,
      dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString().substring(0, 10) : '',
      status: debt.status,
      participants: [...debt.participants],
      note: debt.note || '',
    });
    
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  async saveEdit(): Promise<void> {
    const debtId = this.debtId();
    const form = this.editForm();
    
    if (!debtId || !form.contact.trim() || form.amount <= 0) {
      return;
    }

    const dueDate = form.dueDate ? new Date(form.dueDate).toISOString() : undefined;
    const direction = form.kind === 'credit' || form.kind === 'loan' ? 'owed' : 'lent';

    await this.debtsStore.updateDebt(debtId, {
      contact: form.contact.trim(),
      kind: form.kind,
      direction,
      amount: Math.abs(form.amount),
      currency: this.currencyService.normalizeCode(form.currency),
      dueDate,
      status: form.status,
      participants: form.participants.filter(p => p.trim()),
      note: form.note.trim() || undefined,
    });

    this.isEditing.set(false);
    await this.loadDebt();
  }

  startAddPayment(): void {
    this.paymentForm.set({
      type: 'payment',
      amount: 0,
      note: '',
    });
    this.isAddingPayment.set(true);
  }

  cancelAddPayment(): void {
    this.isAddingPayment.set(false);
  }

  async savePayment(): Promise<void> {
    const debtId = this.debtId();
    const form = this.paymentForm();
    
    if (!debtId || form.amount <= 0) {
      return;
    }

    await this.debtsStore.addDebtTransaction(debtId, {
      type: form.type,
      amount: Math.abs(form.amount),
      note: form.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    this.isAddingPayment.set(false);
    await this.loadDebt();
  }

  addParticipant(): void {
    const form = this.editForm();
    this.editForm.set({
      ...form,
      participants: [...form.participants, ''],
    });
  }

  updateParticipant(index: number, value: string): void {
    const form = this.editForm();
    const participants = [...form.participants];
    participants[index] = value;
    this.editForm.set({
      ...form,
      participants,
    });
  }

  removeParticipant(index: number): void {
    const form = this.editForm();
    const participants = form.participants.filter((_, i) => i !== index);
    this.editForm.set({
      ...form,
      participants,
    });
  }

  formatAmount(amount: number): string {
    const debt = this.debt();
    const currency = debt?.currency || this.defaultCurrencyCode();
    return this.currencyService.format(amount, currency, 0);
  }

  private getInitialActionLabel(kind: DebtKind): string {
    switch (kind) {
      case 'credit':
        return 'Взят кредит';
      case 'deposit':
        return 'Открыт депозит';
      case 'loan':
        return 'Получен займ';
      case 'lend':
        return 'Выдан займ';
      default:
        return 'Создано';
    }
  }

  private getTransactionActionLabel(type: string): string {
    switch (type) {
      case 'payment':
        return 'Оплата';
      case 'charge':
        return 'Начисление';
      case 'note':
        return 'Заметка';
      default:
        return 'Событие';
    }
  }

  trackParticipant(index: number): number {
    return index;
  }

  trackTimeline(_: number, entry: TimelineEntry): string {
    return entry.date + entry.action;
  }
}
