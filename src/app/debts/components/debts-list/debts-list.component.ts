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

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#EF5350', '#EC407A', '#AB47BC', '#7E57C2', '#5C6BC0',
      '#42A5F5', '#29B6F6', '#26C6DA', '#26A69A', '#66BB6A',
      '#9CCC65', '#D4E157', '#FFEE58', '#FFCA28', '#FFA726', '#FF7043'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
  }
}
