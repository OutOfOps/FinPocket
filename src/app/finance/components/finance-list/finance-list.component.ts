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


  deleteTransaction(id: number): void {
    if (confirm('Удалить эту операцию?')) {
      this.transactionsStore.deleteTransaction(id);
    }
  }
}
