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
  readonly amountString = signal('0');
  readonly selectedCategory = signal<string>('');
  readonly selectedAccount = signal<string>('');
  readonly note = signal('');
  readonly date = signal(new Date().toISOString().substring(0, 10));

  // Options
  readonly categories = ['Продукты', 'Транспорт', 'Дом', 'Кафе', 'Здоровье', 'Развлечения', 'Покупки', 'Счета', 'Зарплата', 'Долг'];
  readonly accounts = this.accountsService.accounts;
  readonly defaultCurrencyCode = this.transactionsStore.defaultCurrencyCode;

  constructor() {
    // Select first account by default
    effect(() => {
      const accounts = this.accounts();
      if (accounts.length && !this.selectedAccount()) {
        this.selectedAccount.set(accounts[0].name);
      }
    });
  }

  // Calculator Logic
  appendDigit(digit: string): void {
    const current = this.amountString();
    if (current === '0' && digit !== '.') {
      this.amountString.set(digit);
    } else {
      if (digit === '.' && current.includes('.')) return;
      if (current.replace('.', '').length >= 9) return; // Limit length
      this.amountString.set(current + digit);
    }
  }

  backspace(): void {
    const current = this.amountString();
    if (current.length === 1) {
      this.amountString.set('0');
    } else {
      this.amountString.set(current.slice(0, -1));
    }
  }

  clear(): void {
    this.amountString.set('0');
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
    return parseFloat(this.amountString()) > 0 && !!this.selectedCategory() && !!this.selectedAccount();
  }

  async submit(): Promise<void> {
    const amountVal = parseFloat(this.amountString());
    if (amountVal <= 0 || !this.selectedCategory()) return;

    await this.transactionsStore.addTransaction({
      type: this.type(),
      amount: amountVal,
      currency: this.currencyService.getDefaultCurrencyCode(), // Default for now
      category: this.selectedCategory(),
      account: this.selectedAccount(),
      occurredAt: new Date(this.date()).toISOString(),
      note: this.note().trim() || undefined,
    });

    // Go back to list
    this.router.navigate(['/finance']);
  }
}
