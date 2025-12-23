import { Component, computed, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { CurrencyService } from '../../../core/services/currency.service';
import { DebtsStore, DebtKind, DebtStatus } from '../../services/debts.store';
import { Router, ActivatedRoute } from '@angular/router';

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
  private readonly route = inject(ActivatedRoute);

  // Form State
  readonly debtId = signal<number | null>(null);
  readonly direction = signal<'borrowed' | 'lent'>('borrowed');
  readonly amount = signal<number>(0);
  readonly contactName = signal('');
  readonly note = signal('');
  readonly currency = signal(this.currencyService.getDefaultCurrencyCode());
  readonly dueDate = signal(new Date().toISOString().substring(0, 10));

  readonly currencies = this.currencyService.currencies;

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  constructor() {
    this.initForm();
  }

  private initForm(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.debtId.set(id);
        const debt = this.debtsStore.getDebt(id);
        if (debt) {
          this.direction.set(debt.direction === 'owed' ? 'borrowed' : 'lent');
          this.amount.set(debt.amount);
          this.contactName.set(debt.contact);
          this.note.set(debt.note || '');
          this.currency.set(debt.currency);
          this.dueDate.set(debt.dueDate ? new Date(debt.dueDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
        }
      }
    }
  }

  setType(dir: 'borrowed' | 'lent'): void {
    this.direction.set(dir);
  }

  cancel(): void {
    this.router.navigate(['/debts']);
  }

  get canSubmit(): boolean {
    return this.amount() > 0 && !!this.contactName().trim();
  }

  async submit(): Promise<void> {
    const amountVal = this.amount();
    if (amountVal <= 0 || !this.contactName().trim()) return;

    const dir = this.direction();
    const kind: DebtKind = dir === 'borrowed' ? 'loan' : 'lend';
    const dbDirection: 'owed' | 'lent' = dir === 'borrowed' ? 'owed' : 'lent';

    const debtData = {
      contact: this.contactName().trim(),
      kind: kind,
      direction: dbDirection,
      amount: amountVal,
      currency: this.currency(),
      dueDate: this.dueDate() ? new Date(this.dueDate()).toISOString() : undefined,
      status: 'active' as DebtStatus,
      participants: ['Вы', this.contactName().trim()],
      note: this.note().trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const id = this.debtId();
    if (id !== null) {
      await this.debtsStore.updateDebt(id, debtData);
    } else {
      await this.debtsStore.addDebt(debtData);
    }

    this.router.navigate(['/debts']);
  }
}
