import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { MetersStore, MeterReadingListItem } from '../../services/meters-store.service';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-meters-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-list.component.html',
  styleUrls: ['./meters-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetersListComponent {
  private readonly store = inject(MetersStore);
  private readonly currencyService = inject(CurrencyService);

  readonly readings = this.store.readingList;
  readonly groupedObjects = this.store.groupedReadings;
  readonly selectedMonth = this.store.selectedMonth;

  trackObject(_index: number, obj: any): string {
    return obj.objectName;
  }

  nextMonth(): void {
    this.changeMonth(1);
  }

  prevMonth(): void {
    this.changeMonth(-1);
  }

  private changeMonth(delta: number): void {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const nextMonth = date.toISOString().slice(0, 7);
    this.store.setMonth(nextMonth);
  }

  trackReading(_Index: number, reading: MeterReadingListItem): string {
    return reading.id;
  }

  formatConsumption(reading: MeterReadingListItem): string {
    return reading.zones
      .map((zone) => {
        const base = `${zone.consumption.toFixed(2).replace(/\.00$/, '')} ${reading.unit}`;
        return `${zone.label}: ${base}`;
      })
      .join(' • ');
  }

  getIcon(type: any): string {
    return this.store.typeIcon(type);
  }

  getTypeClass(type: string): string {
    return `type-${type}`;
  }
}
