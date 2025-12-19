import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { TransactionsStore } from '../../services/transactions.store';

@Component({
    selector: 'app-finance-stats',
    standalone: true,
    imports: [SharedModule, NgxChartsModule],
    templateUrl: './finance-stats.component.html',
    styleUrls: ['./finance-stats.component.scss']
})
export class FinanceStatsComponent {
    private readonly store = inject(TransactionsStore);

    // Expose window for template width calculation (simple responsiveness)
    readonly window = window;

    readonly expensesByCategory = this.store.expensesByCategorySignal;
    readonly history = this.store.monthlyHistorySignal;

    // Neo Color Scheme
    readonly colorScheme: Color = {
        name: 'neo',
        selectable: true,
        group: ScaleType.Ordinal,
        domain: [
            '#6200ee', '#03dac6', '#ff0266', '#ffde03',
            '#018786', '#b00020', '#3700b3', '#00bfa5'
        ]
    };

    readonly historyScheme: Color = {
        name: 'history',
        selectable: true,
        group: ScaleType.Ordinal,
        domain: ['#03dac6', '#ff0266'] // Green for Income, Red/Pink for Expense
    };
}
