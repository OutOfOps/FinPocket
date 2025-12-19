import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { SubscriptionEntity } from '../../core/services/finpocket-db.service';
import { CurrencyService } from '../../core/services/currency.service';
import { TransactionsStore } from './transactions.store';

@Injectable({ providedIn: 'root' })
export class SubscriptionsStore {
    private readonly storage = inject(StorageService);
    private readonly currencyService = inject(CurrencyService);
    private readonly transactionsStore = inject(TransactionsStore);

    private readonly subscriptionsSignal = signal<SubscriptionEntity[]>([]);

    readonly subscriptions = computed(() => this.subscriptionsSignal());

    readonly totalMonthly = computed(() =>
        this.subscriptionsSignal()
            .filter((s) => s.active)
            .reduce((sum, s) => sum + this.currencyService.convertToDefault(s.amount, s.currency), 0)
    );

    readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

    constructor() {
        this.refresh();
    }

    async refresh(): Promise<void> {
        const data = await this.storage.getSubscriptions();
        this.subscriptionsSignal.set(data);
    }

    async addSubscription(item: Omit<SubscriptionEntity, 'id'>): Promise<void> {
        await this.storage.addSubscription(item);
        await this.refresh();
    }

    async updateSubscription(id: number, changes: Partial<SubscriptionEntity>): Promise<void> {
        await this.storage.updateSubscription(id, changes);
        await this.refresh();
    }

    async deleteSubscription(id: number): Promise<void> {
        await this.storage.deleteSubscription(id);
        await this.refresh();
    }

    async processPayment(subscription: SubscriptionEntity, accountName: string): Promise<void> {
        // Create actual transaction
        await this.transactionsStore.addTransaction({
            type: 'expense',
            amount: subscription.amount,
            currency: subscription.currency,
            category: subscription.category,
            account: accountName, // User needs to select account
            occurredAt: new Date().toISOString(),
            note: `Оплата подписки: ${subscription.name}`,
        });
    }
}
