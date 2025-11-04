import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';

interface DebtItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue';
}

@Component({
  selector: 'app-debts-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './debts-list.component.html',
  styleUrls: ['./debts-list.component.scss'],
})
export class DebtsListComponent {
  private readonly currencyService = inject(CurrencyService);

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  readonly debts: DebtItem[] = [
    { id: 'DBT-001', name: 'Кредит на авто', amount: 520000, currency: 'UAH', dueDate: '2026-04-12', status: 'active' },
    { id: 'DBT-002', name: 'Займ от ИП Иванова', amount: 150000, currency: 'UAH', dueDate: '2024-06-01', status: 'overdue' },
    { id: 'DBT-003', name: 'Рассрочка техника', amount: 48000, currency: 'UAH', dueDate: '2024-08-20', status: 'active' },
    { id: 'DBT-004', name: 'Кредитная карта', amount: 2300, currency: 'USD', dueDate: '2024-04-28', status: 'paid' },
  ];

  statusLabel(status: DebtItem['status']): string {
    switch (status) {
      case 'active':
        return 'В процессе';
      case 'paid':
        return 'Закрыт';
      case 'overdue':
        return 'Просрочен';
    }
  }

  formattedAmount(debt: DebtItem): string {
    const converted = this.currencyService.convertToDefault(debt.amount, debt.currency);
    return this.currencyService.format(converted, this.defaultCurrencyCode(), 0);
  }
}
