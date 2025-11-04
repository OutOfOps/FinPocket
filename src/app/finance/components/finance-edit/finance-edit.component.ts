import { Component, computed, effect, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { TransactionsStore } from '../../services/transactions.store';
import { CurrencyService } from '../../../core/services/currency.service';
import {
  OperationAccount,
  OperationAccountsService,
} from '../../services/operation-accounts.service';

interface FinanceFormModel {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  category: string;
  account: string;
  date: string;
  note: string;
}

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

  readonly formModel: FinanceFormModel = {
    type: 'expense',
    amount: 0,
    currency: this.currencyService.getDefaultCurrencyCode(),
    category: '',
    account: '',
    date: new Date().toISOString().substring(0, 10),
    note: '',
  };

  readonly categories = ['Продукты', 'Транспорт', 'Дом', 'Здоровье', 'Образование'];
  readonly currencies = this.currencyService.currencies;
  readonly accounts = this.accountsService.accounts;

  readonly accountNames = computed(() => this.accounts().map((account) => account.name));
  readonly defaultCurrency = computed(() => this.currencyService.defaultCurrencyDetails());

  protected readonly accountsEditorOpen = signal(false);
  protected newAccountName = '';
  protected editingAccountId: string | null = null;
  protected editingAccountName = '';

  constructor() {
    effect(() => {
      const defaultCurrency = this.currencyService.getDefaultCurrencyCode();

      if (this.formModel.currency !== defaultCurrency) {
        this.formModel.currency = defaultCurrency;
      }
    });

    effect(() => {
      const accounts = this.accounts();

      if (!accounts.length) {
        return;
      }

      if (!accounts.some((account) => account.name === this.formModel.account)) {
        this.formModel.account = accounts[0].name;
      }
    });
  }

  updateType(type: FinanceFormModel['type']): void {
    this.formModel.type = type;
  }

  toggleAccountsEditor(): void {
    this.accountsEditorOpen.update((open) => !open);
  }

  addAccount(): void {
    this.accountsService.addAccount(this.newAccountName);
    this.newAccountName = '';
  }

  startAccountEdit(account: OperationAccount): void {
    this.editingAccountId = account.id;
    this.editingAccountName = account.name;
  }

  cancelAccountEdit(): void {
    this.editingAccountId = null;
    this.editingAccountName = '';
  }

  saveAccountEdit(): void {
    if (!this.editingAccountId || !this.editingAccountName.trim()) {
      return;
    }

    this.accountsService.updateAccount(this.editingAccountId, this.editingAccountName);
    this.cancelAccountEdit();
  }

  removeAccount(account: OperationAccount): void {
    this.accountsService.removeAccount(account.id);

    if (this.formModel.account === account.name) {
      const names = this.accountNames();
      if (names.length) {
        this.formModel.account = names[0];
      }
    }
  }

  canAddAccount(): boolean {
    return Boolean(this.newAccountName.trim());
  }

  canSaveAccountEdit(): boolean {
    return Boolean(this.editingAccountName.trim());
  }

  trackAccount(_: number, account: OperationAccount): string {
    return account.id;
  }

  async submit(): Promise<void> {
    if (this.formModel.amount <= 0 || !this.formModel.category) {
      return;
    }

    const transaction = {
      type: this.formModel.type,
      amount: Math.abs(this.formModel.amount),
      currency: this.formModel.currency,
      category: this.formModel.category,
      account: this.formModel.account,
      occurredAt: new Date(this.formModel.date).toISOString(),
      note: this.formModel.note?.trim() || undefined,
    } as const;

    await this.transactionsStore.addTransaction(transaction);

    this.formModel.amount = 0;
    this.formModel.note = '';
    this.formModel.category = '';
  }
}
