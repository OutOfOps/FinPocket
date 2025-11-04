import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { TransactionsStore } from '../../services/transactions.store';

interface FinanceFormModel {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  category: string;
  account: string;
  date: string;
  note: string;
}

@Component({
  selector: 'app-finance-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './finance-edit.component.html',
  styleUrls: ['./finance-edit.component.scss'],
})
export class FinanceEditComponent {
  private readonly transactionsStore = inject(TransactionsStore);

  readonly formModel: FinanceFormModel = {
    type: 'expense',
    amount: 0,
    currency: '₴',
    category: '',
    account: 'Основной счёт',
    date: new Date().toISOString().substring(0, 10),
    note: '',
  };

  readonly categories = ['Продукты', 'Транспорт', 'Дом', 'Здоровье', 'Образование'];
  readonly accounts = ['Основной счёт', 'Наличные', 'Кредитная карта'];

  updateType(type: FinanceFormModel['type']): void {
    this.formModel.type = type;
  }

  async submit(): Promise<void> {
    if (this.formModel.amount <= 0 || !this.formModel.category) {
      return;
    }

    const transaction = {
      type: this.formModel.type,
      amount: Math.abs(this.formModel.amount),
      currency: this.formModel.currency,
      category: this.formModel.category,
      account: this.formModel.account,
      occurredAt: new Date(this.formModel.date).toISOString(),
      note: this.formModel.note?.trim() || undefined,
    } as const;

    await this.transactionsStore.addTransaction(transaction);

    this.formModel.amount = 0;
    this.formModel.note = '';
    this.formModel.category = '';
  }
}
