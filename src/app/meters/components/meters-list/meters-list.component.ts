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
