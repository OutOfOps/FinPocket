import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { FinanceListItem, TransactionsStore } from '../../services/transactions.store';

@Component({
  selector: 'app-finance-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './finance-list.component.html',
  styleUrls: ['./finance-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinanceListComponent {
  private readonly transactionsStore = inject(TransactionsStore);

  readonly filters = ['Все операции', 'Доходы', 'Расходы', 'По счетам'];
  readonly activeFilter = signal('Все операции');

  readonly transactions = computed<FinanceListItem[]>(() => {
    const allItems = this.transactionsStore.listItems();
    const filter = this.activeFilter();

    switch (filter) {
      case 'Доходы':
        return allItems.filter(t => t.type === 'income');
      case 'Расходы':
        return allItems.filter(t => t.type === 'expense');
      default:
        return allItems;
    }
  });

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
