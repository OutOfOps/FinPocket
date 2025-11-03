import { Component } from '@angular/core';

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
  templateUrl: './finance-edit.component.html',
  styleUrls: ['./finance-edit.component.scss'],
})
export class FinanceEditComponent {
  readonly formModel: FinanceFormModel = {
    type: 'expense',
    amount: 0,
    currency: '₽',
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

  submit(): void {
    // Здесь могла бы быть интеграция с API FinPocket.
    console.info('Сохранение транзакции', this.formModel);
  }
}
