import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { TransactionsStore } from '../../../finance/services/transactions.store';
import { CurrencyService } from '../../../core/services/currency.service';

interface CategoryRow {
  category: string;
  amount: number;
  share: number;
}

@Component({
  selector: 'app-stats-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './stats-details.component.html',
  styleUrls: ['./stats-details.component.scss'],
})
export class StatsDetailsComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly currencyService = inject(CurrencyService);
  readonly defaultCurrencyCode = computed(() => this.transactionsStore.defaultCurrencyCode());

  readonly rows = computed<CategoryRow[]>(() => {
    const totals = this.transactionsStore.currentMonthExpensesByCategory();
    const totalAmount = totals.reduce((sum, item) => sum + item.amount, 0);

    if (totalAmount === 0) {
      return [];
    }

    return totals.map((item) => ({
      category: item.category || 'Без категории',
      amount: item.amount,
      share: (item.amount / totalAmount) * 100,
    }));
  });

  readonly totalExpenses = computed(() => this.transactionsStore.currentMonthTotals().expenses);

  readonly hasData = computed(() => this.rows().length > 0);

  formatCurrency(amount: number, fractionDigits = 0): string {
    return this.currencyService.format(amount, this.defaultCurrencyCode(), fractionDigits);
  }
}
