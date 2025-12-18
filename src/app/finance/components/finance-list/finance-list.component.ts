import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { FinanceListItem, TransactionsStore } from '../../services/transactions.store';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-finance-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './finance-list.component.html',
  styleUrls: ['./finance-list.component.scss'],
})
export class FinanceListComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  protected readonly currencyService = inject(CurrencyService);

  readonly filters = ['Все операции', 'Доходы', 'Расходы', 'По счетам'];

  readonly transactions = computed<FinanceListItem[]>(() => this.transactionsStore.listItems());

  readonly balance = computed(() => this.transactionsStore.balance());

  readonly expenses = computed(() => -this.transactionsStore.totalExpenses());

  readonly income = computed(() => this.transactionsStore.totalIncome());

  readonly defaultCurrencyCode = this.transactionsStore.defaultCurrencyCode;

  getCategoryIcon(category: string): string {
    const map: Record<string, string> = {
      'Продукты': 'shopping_cart',
      'Транспорт': 'directions_car',
      'Дом': 'home',
      'Кафе': 'restaurant',
      'Здоровье': 'medical_services',
      'Развлечения': 'movie',
      'Покупки': 'shopping_bag',
      'Счета': 'receipt',
      'Зарплата': 'payments',
      'Перевод': 'swap_horiz',
      'Долг': 'handshake',
    };
    return map[category] || 'category';
  }
}
