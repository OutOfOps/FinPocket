import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
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
export class FinanceStatsComponent implements AfterViewInit, OnDestroy {
    private readonly store = inject(TransactionsStore);

    @ViewChild('chartsContainer')
    private chartsContainer?: ElementRef<HTMLDivElement>;

    private resizeObserver?: ResizeObserver;

    readonly chartView = signal<[number, number]>([360, 280]);

    readonly expensesByCategory = this.store.expensesByCategorySignal;
    readonly history = this.store.monthlyHistorySignal;

    // Neo Color Scheme
    readonly colorScheme: Color = {
        name: 'neo',
        selectable: true,
        group: ScaleType.Ordinal,
        domain: [
            '#8B5CF6', // Violet
            '#3B82F6', // Blue
            '#06B6D4', // Cyan
            '#10B981', // Emerald
            '#EC4899', // Pink
            '#F59E0B', // Amber
            '#6366F1', // Indigo
            '#F43F5E'  // Rose
        ]
    };

    readonly historyScheme: Color = {
        name: 'history',
        selectable: true,
        group: ScaleType.Ordinal,
        domain: ['#10B981', '#F43F5E'] // Emerald (Income), Rose (Expense)
    };

    ngAfterViewInit(): void {
        this.observeContainer();
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
    }

    private observeContainer(): void {
        const container = this.chartsContainer?.nativeElement;
        if (!container) return;

        this.updateChartView(container.clientWidth);

        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                this.updateChartView(entry.contentRect.width);
            }
        });

        this.resizeObserver.observe(container);
    }

    private updateChartView(width: number): void {
        const paddingOffset = 32; // matches card inner spacing
        const nextWidth = Math.max(280, Math.round(width - paddingOffset));
        this.chartView.set([nextWidth, 280]);
    }
}
