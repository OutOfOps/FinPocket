import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';
import { DebtsStore, DebtListItem, DebtStatus } from '../../services/debts.store';

@Component({
  selector: 'app-debts-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './debts-list.component.html',
  styleUrls: ['./debts-list.component.scss'],
})
export class DebtsListComponent {
  private readonly debtsStore = inject(DebtsStore);
  protected readonly currencyService = inject(CurrencyService);

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());
  readonly debts = this.debtsStore.listItems;
  readonly totals = this.debtsStore.totals;

  statusLabel(status: DebtStatus): string {
    return this.debtsStore.statusLabel(status);
  }

  trackDebt(_: number, debt: DebtListItem): number {
    return debt.id;
  }
}
