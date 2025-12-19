import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { SubscriptionsStore } from '../../services/subscriptions.store';
import { CurrencyService } from '../../../core/services/currency.service';
import { SubscriptionEntity } from '../../../core/services/finpocket-db.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OperationAccountsService } from '../../services/operation-accounts.service';

@Component({
    selector: 'app-subscriptions-list',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './subscriptions-list.component.html',
    styleUrls: ['./subscriptions-list.component.scss']
})
export class SubscriptionsListComponent {
    private readonly store = inject(SubscriptionsStore);
    protected readonly currencyService = inject(CurrencyService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly accountsService = inject(OperationAccountsService);

    readonly subscriptions = this.store.subscriptions;
    readonly totalMonthly = this.store.totalMonthly;
    readonly defaultCurrencyCode = this.store.defaultCurrencyCode;

    constructor() {
        this.accountsService.ensureDefaults(); // Ensure accounts loaded
    }


    async processPayment(sub: SubscriptionEntity): Promise<void> {
        const accounts = this.accountsService.accounts();
        if (!accounts.length) {
            this.snackBar.open('Нет доступных счетов для оплаты', 'ОК', { duration: 3000 });
            return;
        }

        // Default to first account for now. 
        // Ideally open a dialog to select account.
        const account = accounts[0].name;

        if (confirm(`Оплатить "${sub.name}" со счета ${account}?`)) {
            await this.store.processPayment(sub, account);
            this.snackBar.open('Транзакция добавлена', undefined, { duration: 2000 });
        }
    }

    async deleteSubscription(id: number): Promise<void> {
        if (confirm('Удалить подписку?')) {
            await this.store.deleteSubscription(id);
        }
    }
}
