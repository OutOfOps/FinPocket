import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

interface FinanceTransaction {
  id: string;
  description: string;
  category: string;
  account: string;
  amount: number;
  currency: string;
  date: string;
  tags: string[];
}

@Component({
  selector: 'app-finance-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './finance-list.component.html',
  styleUrls: ['./finance-list.component.scss'],
})
export class FinanceListComponent {
  readonly filters = ['Все операции', 'Доходы', 'Расходы', 'По счетам'];

  readonly transactions: FinanceTransaction[] = [
    {
      id: 'TRX-2401',
      description: 'Перевод на накопительный счёт',
      category: 'Сбережения',
      account: 'Tinkoff Black',
      amount: 15000,
      currency: '₽',
      date: '2024-03-03',
      tags: ['накопления', 'автоматизация'],
    },
    {
      id: 'TRX-2402',
      description: 'Оплата коммунальных услуг',
      category: 'Дом',
      account: 'Семейная карта',
      amount: -6200,
      currency: '₽',
      date: '2024-03-04',
      tags: ['жкх', 'регулярный платеж'],
    },
    {
      id: 'TRX-2403',
      description: 'Фриланс проект UX-аудита',
      category: 'Доходы',
      account: 'USD счёт',
      amount: 850,
      currency: '$',
      date: '2024-03-05',
      tags: ['работа', 'usd'],
    },
  ];

  get balance(): number {
    return this.transactions.reduce((sum, transaction) => sum + this.normalizeAmount(transaction), 0);
  }

  get expenses(): number {
    return this.transactions
      .filter((transaction) => this.normalizeAmount(transaction) < 0)
      .reduce((sum, transaction) => sum + this.normalizeAmount(transaction), 0);
  }

  get income(): number {
    return this.transactions
      .filter((transaction) => this.normalizeAmount(transaction) > 0)
      .reduce((sum, transaction) => sum + this.normalizeAmount(transaction), 0);
  }

  private normalizeAmount(transaction: FinanceTransaction): number {
    const rate = transaction.currency === '$' ? 90 : 1;
    return transaction.amount * rate;
  }
}
