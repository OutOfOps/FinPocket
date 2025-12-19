import { Injectable, effect, signal } from '@angular/core';

export type AccountType = 'cash' | 'bank' | 'metal';

export interface OperationAccount {
  id: string;
  name: string;
  type: AccountType;
  currencyCode: string; // e.g., UAH, USD
  initialBalance: number;
  bankName?: string; // Optional for bank accounts
  metalName?: string; // Optional for metal
}

export interface OperationAccountsSnapshot {
  accounts: OperationAccount[];
}

export interface NewAccount {
  name: string;
  type: AccountType;
  currencyCode: string;
  initialBalance: number;
  bankName?: string;
  metalName?: string;
}

@Injectable({ providedIn: 'root' })
export class OperationAccountsService {
  // ... (rest as before)

  private sanitizeAccount(value: unknown): OperationAccount | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const maybe = value as any;
    const id = typeof maybe.id === 'string' && maybe.id.trim() ? maybe.id.trim() : null;
    const name = typeof maybe.name === 'string' && maybe.name.trim() ? maybe.name.trim() : null;

    if (!id || !name) {
      return null;
    }

    return {
      id,
      name,
      type: maybe.type || 'cash',
      currencyCode: maybe.currencyCode || 'UAH',
      initialBalance: Number(maybe.initialBalance) || 0,
      bankName: maybe.bankName,
      metalName: maybe.metalName
    };
  }
  private readonly storageKey = 'finpocket-operation-accounts';

  private readonly accountsSignal = signal<OperationAccount[]>(this.loadAccounts());

  readonly accounts = this.accountsSignal.asReadonly();

  constructor() {
    effect(() => {
      this.persistAccounts(this.accountsSignal());
    });
  }

  ensureDefaults(): void {
    if (this.accountsSignal().length === 0) {
      this.accountsSignal.set(this.getDefaults());
    }
  }

  addAccount(newAccount: NewAccount): void {
    if (!newAccount.name.trim()) return;

    this.accountsSignal.update((accounts) => [
      ...accounts,
      {
        id: this.generateId(newAccount.name),
        name: newAccount.name.trim(),
        type: newAccount.type,
        currencyCode: newAccount.currencyCode,
        initialBalance: newAccount.initialBalance ?? 0,
        bankName: newAccount.bankName?.trim(),
        metalName: newAccount.metalName?.trim()
      },
    ]);
  }

  updateAccount(id: string, updates: Partial<NewAccount>): void {
    this.accountsSignal.update((accounts) =>
      accounts.map((account) => {
        if (account.id !== id) return account;
        return {
          ...account,
          ...updates,
          name: updates.name?.trim() ?? account.name,
          bankName: updates.bankName?.trim() ?? account.bankName,
          metalName: updates.metalName?.trim() ?? account.metalName
        };
      })
    );
  }

  removeAccount(id: string): void {
    this.accountsSignal.set(this.accountsSignal().filter((account) => account.id !== id));
  }

  getSnapshot(): OperationAccountsSnapshot {
    return {
      accounts: this.accountsSignal().map((account) => ({ ...account })),
    };
  }

  restoreSnapshot(snapshot: OperationAccountsSnapshot): void {
    // Basic restore logic
    const sanitized: OperationAccount[] = (snapshot.accounts || []).map(a => ({
      ...a,
      // Ensure defaults for older versions
      type: (a as any).type || 'cash',
      currencyCode: (a as any).currencyCode || 'UAH',
      initialBalance: (a as any).initialBalance || 0
    }));
    this.accountsSignal.set(sanitized);
  }

  private loadAccounts(): OperationAccount[] {
    const win = this.safeWindow();
    if (!win) return [];

    try {
      const stored = win.localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      // Migration: Add new fields if missing
      const migrated = parsed.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type || 'cash',
        currencyCode: acc.currencyCode || 'UAH',
        initialBalance: acc.initialBalance || 0,
        bankName: acc.bankName,
        metalName: acc.metalName
      })).filter(a => !!a.id && !!a.name);

      if (migrated.length === 0) return this.getDefaults();
      return migrated;
    } catch {
      return this.getDefaults();
    }
  }

  private getDefaults(): OperationAccount[] {
    return [
      { id: 'acc-cash', name: 'Наличные', type: 'cash', currencyCode: 'UAH', initialBalance: 0 },
      { id: 'acc-card', name: 'Карта', type: 'bank', currencyCode: 'UAH', initialBalance: 0, bankName: 'Monobank' }
    ];
  }

  // ... rest of methods


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
    this.accountsSignal.set([]);
  }
}
