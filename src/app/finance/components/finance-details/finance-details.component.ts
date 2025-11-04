import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-finance-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './finance-details.component.html',
  styleUrls: ['./finance-details.component.scss'],
})
export class FinanceDetailsComponent {
  private readonly currencyService = inject(CurrencyService);

  readonly scenario = {
    id: 'scenario-monthly-budget',
    title: 'Март 2024',
    plannedIncome: 215000,
    plannedExpenses: 172500,
    actualIncome: 205400,
    actualExpenses: 164200,
    comment: 'Основные перерасходы пришлись на транспорт и сервисы подписок.',
  };

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  formatCurrency(amount: number, fractionDigits = 0): string {
    return this.currencyService.format(amount, this.defaultCurrencyCode(), fractionDigits);
  }

  get balanceDelta(): number {
    return (this.scenario.actualIncome - this.scenario.actualExpenses) - (this.scenario.plannedIncome - this.scenario.plannedExpenses);
  }
}
