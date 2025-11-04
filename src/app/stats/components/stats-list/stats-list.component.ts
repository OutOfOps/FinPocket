import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { TransactionsStore } from '../../../finance/services/transactions.store';
import { CurrencyService } from '../../../core/services/currency.service';

interface ChartCard {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

@Component({
  selector: 'app-stats-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './stats-list.component.html',
  styleUrls: ['./stats-list.component.scss'],
})
export class StatsListComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly currencyService = inject(CurrencyService);
  private readonly defaultCurrencyCode = computed(() => this.transactionsStore.defaultCurrencyCode());

  readonly charts = computed<ChartCard[]>(() => {
    const current = this.transactionsStore.currentMonthTotals();
    const previous = this.transactionsStore.previousMonthTotals();

    const formatCurrency = (value: number) =>
      this.currencyService.format(Math.round(value), this.defaultCurrencyCode(), 0);

    const formatNet = (value: number) => {
      const formatted = formatCurrency(Math.abs(value));
      return value >= 0 ? formatted : `−${formatted}`;
    };

    return [
      {
        title: 'Расходы за месяц',
        value: formatCurrency(current.expenses),
        trend: this.transactionsStore.trend(current.expenses, previous.expenses),
        description: this.transactionsStore.describeChange(
          current.expenses,
          previous.expenses,
          'расходах',
          true
        ),
      },
      {
        title: 'Доходы за месяц',
        value: formatCurrency(current.income),
        trend: this.transactionsStore.trend(current.income, previous.income),
        description: this.transactionsStore.describeChange(current.income, previous.income, 'доходах'),
      },
      {
        title: 'Чистый результат',
        value: formatNet(current.net),
        trend: this.transactionsStore.trend(current.net, previous.net),
        description: this.transactionsStore.describeChange(
          current.net,
          previous.net,
          'чистом результате'
        ),
      },
    ];
  });

  readonly hasTransactions = computed(() => this.transactionsStore.transactions().length > 0);
}
