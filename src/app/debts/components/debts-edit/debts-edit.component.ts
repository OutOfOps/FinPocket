import { Component, computed, effect, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';
import { DebtsStore, DebtKind, DebtStatus } from '../../services/debts.store';
import { Router } from '@angular/router';

@Component({
  selector: 'app-debts-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './debts-edit.component.html',
  styleUrls: ['./debts-edit.component.scss'],
})
export class DebtsEditComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly debtsStore = inject(DebtsStore);
  private readonly router = inject(Router);

  // Form State
  readonly direction = signal<'borrowed' | 'lent'>('borrowed'); // borrowed = I owe, lent = Owed to me
  readonly amountString = signal('0');
  readonly contactName = signal('');
  readonly note = signal('');
  readonly dueDate = signal(new Date().toISOString().substring(0, 10));

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  // Logic to map direction to DebtKind
  // borrowed -> loan (primary)
  // lent -> lend (primary)

  setType(dir: 'borrowed' | 'lent'): void {
    this.direction.set(dir);
  }

  // Calculator Logic
  appendDigit(digit: string): void {
    const current = this.amountString();
    if (current === '0' && digit !== '.') {
      this.amountString.set(digit);
    } else {
      if (digit === '.' && current.includes('.')) return;
      if (current.replace('.', '').length >= 9) return;
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

  get canSubmit(): boolean {
    return parseFloat(this.amountString()) > 0 && !!this.contactName().trim();
  }

  async submit(): Promise<void> {
    const amountVal = parseFloat(this.amountString());
    if (amountVal <= 0 || !this.contactName().trim()) return;

    const dir = this.direction();
    const kind: DebtKind = dir === 'borrowed' ? 'loan' : 'lend';
    const dbDirection = dir === 'borrowed' ? 'owed' : 'lent';

    await this.debtsStore.addDebt({
      contact: this.contactName().trim(),
      kind: kind,
      direction: dbDirection,
      amount: amountVal,
      currency: this.currencyService.getDefaultCurrencyCode(),
      dueDate: new Date(this.dueDate()).toISOString(),
      status: 'active',
      participants: ['Вы', this.contactName().trim()],
      note: this.note().trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    this.router.navigate(['/debts']);
  }
}
