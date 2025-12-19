import { Component, computed, inject, signal } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { SubscriptionsStore } from '../../services/subscriptions.store';
import { CurrencyService } from '../../../core/services/currency.service';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-subscriptions-edit',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './subscriptions-edit.component.html',
    styleUrls: ['./subscriptions-edit.component.scss']
})
export class SubscriptionsEditComponent {
    private readonly store = inject(SubscriptionsStore);
    private readonly currencyService = inject(CurrencyService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly id = signal<string | null>(null);
    readonly isEditMode = computed(() => !!this.id());

    // Form State
    readonly name = signal('');
    readonly amount = signal<number | null>(null);
    readonly currency = signal(this.currencyService.getDefaultCurrencyCode());
    readonly category = signal('Digital');
    readonly paymentDay = signal<number>(1);

    readonly currencies = this.currencyService.currencies;
    readonly categories = ['Digital', 'Education', 'Utility', 'Other'];

    constructor() {
        this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(async (params) => {
            const id = params.get('id');
            if (id) {
                this.id.set(id);
                const all = this.store.subscriptions();
                const found = all.find(s => s.id === Number(id));
                // If store not ready, we might miss it. Refresh just in case.
                if (!found) await this.store.refresh();
                const sub = this.store.subscriptions().find(s => s.id === Number(id));

                if (sub) {
                    this.name.set(sub.name);
                    this.amount.set(sub.amount);
                    this.currency.set(sub.currency);
                    this.category.set(sub.category);
                    this.paymentDay.set(sub.paymentDay || 1);
                }
            }
        });
    }

    async save(): Promise<void> {
        const data = {
            name: this.name(),
            amount: this.amount() || 0,
            currency: this.currency(),
            category: this.category(),
            paymentDay: this.paymentDay(),
            active: true
        };

        if (this.isEditMode()) {
            await this.store.updateSubscription(Number(this.id()), data);
        } else {
            await this.store.addSubscription(data);
        }

        this.router.navigate(['../'], { relativeTo: this.route });
    }
}
