import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';
import { TransactionsStore } from '../../services/transactions.store';

@Component({
  selector: 'app-finance-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './finance-details.component.html',
  styleUrls: ['./finance-details.component.scss'],
})
export class FinanceDetailsComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly transactionsStore = inject(TransactionsStore);

  readonly scenario = {
    id: 'scenario-monthly-budget',
    title: 'Март 2024',
    plannedIncome: 215000,
    plannedExpenses: 172500,
    comment: 'Основные перерасходы пришлись на транспорт и сервисы подписок.',
  };

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  readonly actualIncome = computed(() => this.transactionsStore.currentMonthTotals().income);
  readonly actualExpenses = computed(() => this.transactionsStore.currentMonthTotals().expenses);

  private readonly plannedNet = computed(
    () => this.scenario.plannedIncome - this.scenario.plannedExpenses
  );

  private readonly actualNet = computed(() => this.actualIncome() - this.actualExpenses());

  formatCurrency(amount: number, fractionDigits = 0): string {
    return this.currencyService.format(amount, this.defaultCurrencyCode(), fractionDigits);
  }

  readonly balanceDelta = computed(() => this.actualNet() - this.plannedNet());
}
