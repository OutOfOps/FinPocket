import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-debts-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './debts-details.component.html',
  styleUrls: ['./debts-details.component.scss'],
})
export class DebtsDetailsComponent {
  private readonly currencyService = inject(CurrencyService);
  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  readonly timeline = [
    { date: '2024-01-12', action: 'Выдан займ', amount: 150000 },
    { date: '2024-02-10', action: 'Частичное погашение', amount: -35000 },
    { date: '2024-03-01', action: 'Напоминание отправлено', amount: 0 },
  ];

  formatAmount(amount: number): string {
    return this.currencyService.format(amount, this.defaultCurrencyCode(), 0);
  }
}
