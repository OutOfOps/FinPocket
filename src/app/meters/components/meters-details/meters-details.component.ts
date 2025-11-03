import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedModule } from '../../../shared/shared-module';
import { ResourcePricingModel, ResourceSummary, TariffHistoryEntry } from '../../models/resource';
import { MetersStoreService } from '../../services/meters-store.service';
import { MeterReadingValue } from '../../models/meter-reading';

interface ReadingSummary {
  id: string;
  submittedAt: string;
  values: { label: string; value: number }[];
  previousAt?: string;
  consumption: { label: string; value: number }[];
  cost?: number;
  currency?: string;
}

@Component({
  selector: 'app-meters-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-details.component.html',
  styleUrls: ['./meters-details.component.scss'],
})
export class MetersDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(MetersStoreService);
  private readonly destroyRef = inject(DestroyRef);

  summary?: ResourceSummary;
  readings: ReadingSummary[] = [];
  tariffHistory: TariffHistoryEntry[] = [];

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const resourceId = params.get('id');
        if (!resourceId) {
          return;
        }

        this.load(resourceId);
      });
  }

  trackReading(_: number, reading: ReadingSummary): string {
    return reading.id;
  }

  pricingLabel(model: ResourcePricingModel): string {
    switch (model) {
      case 'fixed':
        return 'Фиксированная плата';
      case 'per_unit':
      default:
        return 'По показаниям счётчика';
    }
  }

  zoneName(zoneId?: string): string {
    const resource = this.summary?.resource;
    if (!resource) {
      return zoneId ?? 'Общий тариф';
    }

    if (!zoneId) {
      if (resource.pricingModel === 'fixed') {
        return 'Абонентская плата';
      }

      return resource.zones.length > 1 ? 'Общий тариф' : resource.zones[0]?.name ?? 'Общий тариф';
    }

    return resource.zones.find((zone) => zone.id === zoneId)?.name ?? zoneId;
  }

  zoneSummaryText(): string {
    const resource = this.summary?.resource;
    if (!resource) {
      return '—';
    }

    return resource.zones.map((zone) => zone.name).join(', ');
  }

  private load(resourceId: string): void {
    this.summary = this.store.getResourceSummary(resourceId);
    const resource = this.store.getResourceById(resourceId);

    if (!resource) {
      this.readings = [];
      this.tariffHistory = [];
      return;
    }

    const readings = this.store.getReadingsForResource(resourceId);
    this.readings = readings.map((reading) => {
      const summary = this.store.estimatePeriodSummary(
        resourceId,
        reading.values,
        reading.submittedAt,
        reading.id
      );

      return {
        id: reading.id,
        submittedAt: reading.submittedAt,
        values: resource.zones.map((zone) => ({
          label: zone.name,
          value: this.zoneValue(reading.values, zone.id),
        })),
        previousAt: summary.previous?.submittedAt,
        consumption: resource.zones.map((zone) => ({
          label: zone.name,
          value: summary.consumption.get(zone.id) ?? 0,
        })),
        cost: summary.cost,
        currency: summary.currency,
      } satisfies ReadingSummary;
    });

    this.tariffHistory = this.store.getTariffHistory(resourceId);
  }

  private zoneValue(values: MeterReadingValue[], zoneId: string): number {
    return values.find((value) => value.zoneId === zoneId)?.value ?? 0;
  }
}
