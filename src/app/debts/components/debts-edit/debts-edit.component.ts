import { Component, computed, effect, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';
import { DebtsStore, DebtKind, DebtStatus } from '../../services/debts.store';

interface DebtForm {
  name: string;
  type: DebtKind;
  amount: number;
  currency: string;
  dueDate: string;
  participants: string[];
  status: DebtStatus;
  note: string;
}

@Component({
  selector: 'app-debts-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './debts-edit.component.html',
  styleUrls: ['./debts-edit.component.scss'],
})
export class DebtsEditComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly debtsStore = inject(DebtsStore);

  readonly model: DebtForm = {
    name: '',
    type: 'credit',
    amount: 0,
    currency: this.currencyService.getDefaultCurrencyCode(),
    dueDate: new Date().toISOString().substring(0, 10),
    participants: ['Вы'],
    status: 'active',
    note: '',
  };

  readonly typeOptions: { value: DebtKind; label: string }[] = [
    { value: 'credit', label: 'Кредит' },
    { value: 'deposit', label: 'Депозит' },
    { value: 'loan', label: 'Займ' },
    { value: 'lend', label: 'Даю в займы' },
  ];

  readonly statusOptions: DebtStatus[] = ['active', 'paid', 'overdue'];
  readonly currencies = this.currencyService.currencies;
  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  constructor() {
    effect(() => {
      const defaultCurrency = this.currencyService.getDefaultCurrencyCode();
      if (this.model.currency !== defaultCurrency) {
        this.model.currency = defaultCurrency;
      }
    });
  }

  addParticipant(): void {
    this.model.participants = [...this.model.participants, ''];
  }

  trackStatus(index: number, status: DebtForm['status']): string {
    return status;
  }

  trackParticipant(index: number): number {
    return index;
  }

  statusLabel(status: DebtForm['status']): string {
    switch (status) {
      case 'active':
        return 'В процессе';
      case 'paid':
        return 'Закрыт';
      case 'overdue':
        return 'Просрочен';
    }

    return 'Неизвестно';
  }

  async submit(): Promise<void> {
    if (!this.model.name.trim() || this.model.amount <= 0) {
      return;
    }

    const participants = this.model.participants
      .map((participant) => participant.trim())
      .filter(Boolean);

    if (!participants.length) {
      participants.push('Вы');
    }

    const dueDate = this.model.dueDate ? new Date(this.model.dueDate).toISOString() : undefined;

    const direction = this.model.type === 'credit' || this.model.type === 'loan' ? 'owed' : 'lent';

    await this.debtsStore.addDebt({
      contact: this.model.name.trim(),
      kind: this.model.type,
      direction,
      amount: Math.abs(this.model.amount),
      currency: this.currencyService.normalizeCode(this.model.currency),
      dueDate,
      status: this.model.status,
      participants,
      note: this.model.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    this.model.name = '';
    this.model.type = 'credit';
    this.model.amount = 0;
    this.model.participants = ['Вы'];
    this.model.status = 'active';
    this.model.dueDate = new Date().toISOString().substring(0, 10);
    this.model.note = '';
  }
}
