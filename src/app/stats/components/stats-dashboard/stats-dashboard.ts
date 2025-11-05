import { Component, computed, inject, signal } from '@angular/core';
import { TransactionsStore } from '../../../finance/services/transactions.store';
import { DebtsStore } from '../../../debts/services/debts.store';
import { MetersStoreService } from '../../../meters/services/meters-store.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { TransactionEntity } from '../../../core/services/finpocket-db.service';
import { LegendPosition } from '@swimlane/ngx-charts';

type DataType = 'expenses' | 'balance' | 'debts' | 'meters';
type PeriodType = 'week' | 'month' | 'quarter' | 'year';

interface ChartData {
  name: string;
  value: number;
}

interface SeriesData {
  name: string;
  series: ChartData[];
}

@Component({
  selector: 'app-stats-dashboard',
  standalone: false,
  templateUrl: './stats-dashboard.html',
  styleUrl: './stats-dashboard.scss',
})
export class StatsDashboard {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly debtsStore = inject(DebtsStore);
  private readonly metersStore = inject(MetersStoreService);
  private readonly currencyService = inject(CurrencyService);

  readonly legendPosition = LegendPosition.Right;
  
  readonly selectedDataType = signal<DataType>('expenses');
  readonly selectedPeriod = signal<PeriodType>('month');

  readonly dataTypes: { value: DataType; label: string }[] = [
    { value: 'expenses', label: 'Расходы по категориям' },
    { value: 'balance', label: 'Баланс по месяцам' },
    { value: 'debts', label: 'Долги' },
    { value: 'meters', label: 'Потребление ресурсов' },
  ];

  readonly periods: { value: PeriodType; label: string }[] = [
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'quarter', label: 'Квартал' },
    { value: 'year', label: 'Год' },
  ];

  // Pie chart data for expenses by category
  readonly expensesByCategoryData = computed<ChartData[]>(() => {
    const period = this.selectedPeriod();
    const transactions = this.getTransactionsForPeriod(period);
    const categoryMap = new Map<string, number>();

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const current = categoryMap.get(t.category) || 0;
        categoryMap.set(
          t.category,
          current + this.currencyService.convertToDefault(
            Math.abs(t.amount),
            this.currencyService.normalizeCode(t.currency)
          )
        );
      });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  });

  // Line chart data for balance by months
  readonly balanceByMonthData = computed<SeriesData[]>(() => {
    const period = this.selectedPeriod();
    const monthsCount = this.getMonthsCount(period);
    const monthlyData: ChartData[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthTransactions = this.getTransactionsForMonth(i);
      const income = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce(
          (sum, t) =>
            sum +
            this.currencyService.convertToDefault(
              Math.abs(t.amount),
              this.currencyService.normalizeCode(t.currency)
            ),
          0
        );

      const expenses = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce(
          (sum, t) =>
            sum +
            this.currencyService.convertToDefault(
              Math.abs(t.amount),
              this.currencyService.normalizeCode(t.currency)
            ),
          0
        );

      const balance = income - expenses;
      const monthName = this.getMonthName(i);
      monthlyData.push({ name: monthName, value: Math.round(balance) });
    }

    return [{ name: 'Баланс', series: monthlyData }];
  });

  // Bar chart data for debts
  readonly debtsData = computed<ChartData[]>(() => {
    const debts = this.debtsStore.listItems();
    const activeDebts = debts.filter((d) => d.status === 'active');

    const owedTotal = activeDebts
      .filter((d) => d.kind === 'credit' || d.kind === 'loan')
      .reduce((sum, d) => sum + d.convertedAmount, 0);

    const lentTotal = activeDebts
      .filter((d) => d.kind === 'deposit' || d.kind === 'lend')
      .reduce((sum, d) => sum + d.convertedAmount, 0);

    return [
      { name: 'Должны мне', value: Math.round(lentTotal) },
      { name: 'Я должен', value: Math.round(owedTotal) },
    ].filter((item) => item.value > 0);
  });

  // Area chart data for water/gas/electricity consumption
  readonly metersConsumptionData = computed<SeriesData[]>(() => {
    const period = this.selectedPeriod();
    const monthsCount = this.getMonthsCount(period);
    const waterSeries: ChartData[] = [];
    const gasSeries: ChartData[] = [];
    const electricitySeries: ChartData[] = [];

    // Get all readings by iterating through known resource types
    const allReadings: any[] = [];
    
    // Use a workaround to get all resources by checking known objects
    const objectId = this.metersStore.getDefaultObjectId();
    if (objectId) {
      const resources = this.metersStore.getResourcesForObject(objectId);
      for (const resource of resources) {
        const resourceReadings = this.metersStore.getReadingsForResource(resource.id);
        allReadings.push(...resourceReadings);
      }
    }
    
    // Also check for second object if it exists
    const secondObjectId = 'OBJ-002'; // From the service mock data
    const secondResources = this.metersStore.getResourcesForObject(secondObjectId);
    for (const resource of secondResources) {
      const resourceReadings = this.metersStore.getReadingsForResource(resource.id);
      allReadings.push(...resourceReadings);
    }

    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthName = this.getMonthName(i);
      const monthReadings = this.getReadingsForMonth(allReadings, i);

      const waterConsumption = monthReadings
        .filter((r) => {
          const resource = this.metersStore.getResourceById(r.resourceId);
          return resource?.type === 'water';
        })
        .reduce((sum, r) => {
          const resource = this.metersStore.getResourceById(r.resourceId);
          if (!resource) return sum;
          const previous = this.metersStore.getPreviousReading(r.resourceId, r.id);
          const consumption = this.metersStore.calculateConsumption(r, previous);
          return sum + Array.from(consumption.values()).reduce((a, b) => a + b, 0);
        }, 0);

      const gasConsumption = monthReadings
        .filter((r) => {
          const resource = this.metersStore.getResourceById(r.resourceId);
          return resource?.type === 'gas';
        })
        .reduce((sum, r) => {
          const resource = this.metersStore.getResourceById(r.resourceId);
          if (!resource) return sum;
          const previous = this.metersStore.getPreviousReading(r.resourceId, r.id);
          const consumption = this.metersStore.calculateConsumption(r, previous);
          return sum + Array.from(consumption.values()).reduce((a, b) => a + b, 0);
        }, 0);

      const electricityConsumption = monthReadings
        .filter((r) => {
          const resource = this.metersStore.getResourceById(r.resourceId);
          return resource?.type === 'electricity';
        })
        .reduce((sum, r) => {
          const resource = this.metersStore.getResourceById(r.resourceId);
          if (!resource) return sum;
          const previous = this.metersStore.getPreviousReading(r.resourceId, r.id);
          const consumption = this.metersStore.calculateConsumption(r, previous);
          return sum + Array.from(consumption.values()).reduce((a, b) => a + b, 0);
        }, 0);

      waterSeries.push({ name: monthName, value: Math.round(waterConsumption * 10) / 10 });
      gasSeries.push({ name: monthName, value: Math.round(gasConsumption * 10) / 10 });
      electricitySeries.push({ name: monthName, value: Math.round(electricityConsumption * 10) / 10 });
    }

    return [
      { name: 'Вода (м³)', series: waterSeries },
      { name: 'Газ (м³)', series: gasSeries },
      { name: 'Электричество (кВт·ч)', series: electricitySeries },
    ];
  });

  readonly hasMetersData = computed(() => {
    return this.metersConsumptionData().some((seriesItem) => 
      seriesItem.series.some((item) => item.value > 0)
    );
  });

  private getTransactionsForPeriod(period: PeriodType): TransactionEntity[] {
    const now = new Date();
    const startDate = this.getPeriodStartDate(now, period);
    return this.transactionsStore.transactions().filter((t) => {
      const date = new Date(t.occurredAt);
      return date >= startDate && date <= now;
    });
  }

  private getTransactionsForMonth(offset: number): TransactionEntity[] {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const end = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.transactionsStore.transactions().filter((t) => {
      const date = new Date(t.occurredAt);
      return date >= start && date <= end;
    });
  }

  private getReadingsForMonth(readings: any[], offset: number): any[] {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const end = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    return readings.filter((r) => {
      const date = new Date(r.submittedAt);
      return date >= start && date <= end;
    });
  }

  private getPeriodStartDate(now: Date, period: PeriodType): Date {
    switch (period) {
      case 'week':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        return new Date(now.getFullYear(), now.getMonth() - 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
    }
  }

  private getMonthsCount(period: PeriodType): number {
    switch (period) {
      case 'week':
        return 1;
      case 'month':
        return 6;
      case 'quarter':
        return 3;
      case 'year':
        return 12;
    }
  }

  private getMonthName(offset: number): string {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthNames = [
      'Янв',
      'Фев',
      'Мар',
      'Апр',
      'Май',
      'Июн',
      'Июл',
      'Авг',
      'Сен',
      'Окт',
      'Ноя',
      'Дек',
    ];
    return monthNames[targetMonth.getMonth()];
  }

  onDataTypeChange(type: DataType): void {
    this.selectedDataType.set(type);
  }

  onPeriodChange(period: PeriodType): void {
    this.selectedPeriod.set(period);
  }
}
