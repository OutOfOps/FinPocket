import { Injectable, effect, signal } from '@angular/core';

export interface OperationAccount {
  id: string;
  name: string;
}

const DEFAULT_ACCOUNTS: OperationAccount[] = [
  { id: 'account-main', name: 'Основной счёт' },
  { id: 'account-cash', name: 'Наличные' },
  { id: 'account-credit', name: 'Кредитная карта' },
];

@Injectable({ providedIn: 'root' })
export class OperationAccountsService {
  private readonly storageKey = 'finpocket-operation-accounts';

  private readonly accountsSignal = signal<OperationAccount[]>(this.loadAccounts());

  readonly accounts = this.accountsSignal.asReadonly();

  constructor() {
    effect(() => {
      this.persistAccounts(this.accountsSignal());
    });
  }

  addAccount(name: string): void {
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    const exists = this.accountsSignal()
      .map((account) => account.name.toLowerCase())
      .includes(trimmed.toLowerCase());

    if (exists) {
      return;
    }

    this.accountsSignal.update((accounts) => [
      ...accounts,
      {
        id: this.generateId(trimmed),
        name: trimmed,
      },
    ]);
  }

  updateAccount(id: string, name: string): void {
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    this.accountsSignal.update((accounts) =>
      accounts.map((account) => (account.id === id ? { ...account, name: trimmed } : account))
    );
  }

  removeAccount(id: string): void {
    const accounts = this.accountsSignal();

    if (accounts.length <= 1) {
      return;
    }

    this.accountsSignal.set(accounts.filter((account) => account.id !== id));
  }

  private loadAccounts(): OperationAccount[] {
    const win = this.safeWindow();

    if (!win) {
      return [...DEFAULT_ACCOUNTS];
    }

    try {
      const stored = win.localStorage.getItem(this.storageKey);

      if (!stored) {
        return [...DEFAULT_ACCOUNTS];
      }

      const parsed: unknown = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        return [...DEFAULT_ACCOUNTS];
      }

      const sanitized = parsed
        .map((value) => this.sanitizeAccount(value))
        .filter((account): account is OperationAccount => account !== null);

      return sanitized.length ? sanitized : [...DEFAULT_ACCOUNTS];
    } catch {
      return [...DEFAULT_ACCOUNTS];
    }
  }

  private sanitizeAccount(value: unknown): OperationAccount | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const maybeAccount = value as Partial<OperationAccount>;
    const id =
      typeof maybeAccount.id === 'string' && maybeAccount.id.trim() ? maybeAccount.id.trim() : null;
    const name =
      typeof maybeAccount.name === 'string' && maybeAccount.name.trim() ? maybeAccount.name.trim() : null;

    if (!id || !name) {
      return null;
    }

    return { id, name };
  }

  private persistAccounts(accounts: OperationAccount[]): void {
    const win = this.safeWindow();

    if (!win) {
      return;
    }

    try {
      win.localStorage.setItem(this.storageKey, JSON.stringify(accounts));
    } catch {
      // ignore persistence errors
    }
  }

  private generateId(name: string): string {
    const normalized = name.toLowerCase().replace(/\s+/g, '-');
    const random = Math.random().toString(36).slice(2, 8);
    return `account-${normalized}-${random}`;
  }

  private safeWindow(): (Window & typeof globalThis) | null {
    try {
      return typeof window !== 'undefined' ? window : null;
    } catch {
      return null;
    }
  }

  resetToDefaults(): void {
    this.accountsSignal.set([...DEFAULT_ACCOUNTS]);
  }
}
