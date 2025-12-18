import { Component, computed, effect, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { TransactionsStore } from '../../services/transactions.store';
import { CurrencyService } from '../../../core/services/currency.service';
import { OperationAccountsService } from '../../services/operation-accounts.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-finance-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './finance-edit.component.html',
  styleUrls: ['./finance-edit.component.scss'],
})
export class FinanceEditComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly currencyService = inject(CurrencyService);
  private readonly accountsService = inject(OperationAccountsService);
  private readonly router = inject(Router);

  // Form State
  readonly type = signal<'income' | 'expense' | 'transfer'>('expense');
  readonly amount = signal<number | null>(null);
  readonly selectedCurrency = signal<string>(this.transactionsStore.defaultCurrencyCode());
  readonly selectedCategory = signal<string>('');

  // Accounts
  readonly accountFrom = signal<string>('');
  readonly accountTo = signal<string>('');

  readonly note = signal('');
  readonly date = signal(new Date().toISOString().substring(0, 10));

  // Options
  readonly categories = ['Продукты', 'Транспорт', 'Дом', 'Кафе', 'Здоровье', 'Развлечения', 'Покупки', 'Счета', 'Зарплата', 'Долг'];
  readonly accounts = this.accountsService.accounts;
  readonly currencies = this.currencyService.currencies;

  constructor() {
    this.accountsService.ensureDefaults();

    // Select first account by default
    effect(() => {
      const accounts = this.accounts();
      if (accounts.length) {
        if (!this.accountFrom()) this.accountFrom.set(accounts[0].name);
        if (!this.accountTo()) this.accountTo.set(accounts.length > 1 ? accounts[1].name : accounts[0].name);
      }
    });

    // Reset categories when switching type? Optional but good for UX maybe.
    // Keeping it simple for now.
  }

  setType(type: 'income' | 'expense' | 'transfer'): void {
    this.type.set(type);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  getCategoryIcon(category: string): string {
    const map: Record<string, string> = {
      'Продукты': 'shopping_cart',
      'Транспорт': 'directions_car',
      'Дом': 'home',
      'Кафе': 'restaurant',
      'Здоровье': 'medical_services',
      'Развлечения': 'movie',
      'Покупки': 'shopping_bag',
      'Счета': 'receipt',
      'Зарплата': 'payments',
      'Перевод': 'swap_horiz',
      'Долг': 'handshake',
    };
    return map[category] || 'category';
  }

  get canSubmit(): boolean {
    const amt = this.amount();
    if (!amt || amt <= 0) return false;

    if (this.type() === 'transfer') {
      // For transfer we need both accounts (and usually they shouldn't be the same, but we allow it for simplicity)
      return !!this.accountFrom() && !!this.accountTo();
    }

    return !!this.selectedCategory() && !!this.accountFrom();
  }

  async submit(): Promise<void> {
    const amountVal = this.amount();
    if (!amountVal || amountVal <= 0) return;

    const isTransfer = this.type() === 'transfer';
    const mainAccount = this.accountFrom();

    // For transfers, we effectively ignore category or set it to 'Перевод'
    const category = isTransfer ? 'Перевод' : (this.selectedCategory() || 'Прочее');

    // Construct Note
    let finalNote = this.note().trim();
    if (isTransfer) {
      const to = this.accountTo();
      const autoNote = `Перевод на ${to}`;
      finalNote = finalNote ? `${finalNote} (${autoNote})` : autoNote;
    }

    await this.transactionsStore.addTransaction({
      type: this.type(),
      amount: amountVal,
      currency: this.selectedCurrency(),
      category: category,
      account: mainAccount,
      occurredAt: new Date(this.date()).toISOString(),
      note: finalNote || undefined,
    });

    // Go back to list
    this.router.navigate(['/finance']);
  }
}
