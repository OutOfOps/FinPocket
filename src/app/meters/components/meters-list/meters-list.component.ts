import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { MetersStoreService, MeterReadingListItem } from '../../services/meters-store.service';
import { CurrencyService } from '../../../core/services/currency.service';

@Component({
  selector: 'app-meters-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-list.component.html',
  styleUrls: ['./meters-list.component.scss'],
})
export class MetersListComponent {
  private readonly store = inject(MetersStoreService);
  private readonly currencyService = inject(CurrencyService);

  readonly readings$ = this.store.readingList$;
  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  trackReading(_: number, reading: MeterReadingListItem): string {
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

  formatValues(reading: MeterReadingListItem): string {
    return reading.zones
      .map((zone) => `${zone.label}: ${zone.value.toFixed(2).replace(/\.00$/, '')}`)
      .join(' • ');
  }

  formatCost(reading: MeterReadingListItem): string | null {
    if (reading.cost === undefined || !reading.currency) {
      return null;
    }

    return this.currencyService.format(reading.cost, reading.currency);
  }
}
