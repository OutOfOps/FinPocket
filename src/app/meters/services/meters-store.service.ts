import { Injectable, inject, signal, computed } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { ResourceType, ResourceTypeOption } from '../models/resource-type';
import { compareDatesDesc } from '../../core/utils/date-utils';
import { MeterReading, MeterReadingValue } from '../models/meter-reading';
import {
  MeterObject,
  ResourceEntity,
  ResourceSummary,
  ResourceZone,
  TariffHistoryEntry,
} from '../models/resource';

export interface UpsertReadingPayload
  extends Omit<MeterReading, 'id' | 'values' | 'objectId'> {
  id?: string;
  objectId: string;
  values: MeterReadingValue[];
}
export interface UpsertResourcePayload extends Omit<ResourceEntity, 'id' | 'objectId' | 'zones'> {
  id?: string;
  objectName: string;
  zones: ResourceZone[];
  initialValues?: { zoneId: string; value: number }[];
}

export interface AddTariffPayload extends Omit<TariffHistoryEntry, 'id'> { }

export interface MeterReadingListItem {
  id: string;
  objectName: string;
  resourceId: string;
  resourceName: string;
  type: ResourceType;
  typeLabel: string;
  submittedAt: string;
  unit: string;
  zones: {
    id: string;
    label: string;
    value: number;
    previous: number | null;
    consumption: number;
  }[];
  cost?: number;
  currency?: string;
}

export interface GroupedObject {
  objectName: string;
  totalCost: number;
  currency?: string;
  readings: MeterReadingListItem[];
}

@Injectable({ providedIn: 'root' })
export class MetersStore {
  private readonly typeOptionsInternal: ResourceTypeOption[] = [
    {
      type: 'water',
      label: 'Вода',
      unit: 'м³',
      icon: 'water_drop',
      description: 'Холодная и горячая вода',
    },
    {
      type: 'gas',
      label: 'Газ',
      unit: 'м³',
      icon: 'local_fire_department',
      description: 'Природный газ и топливо',
    },
    {
      type: 'electricity',
      label: 'Электричество',
      unit: 'кВт·ч',
      icon: 'bolt',
      description: 'Учёт электроэнергии по зонам',
    },
    {
      type: 'heat',
      label: 'Отопление',
      unit: 'Гкал',
      icon: 'device_thermostat',
      description: 'Центральное отопление и тепло',
    },
    {
      type: 'service',
      label: 'Услуга',
      unit: 'UAH',
      icon: 'miscellaneous_services',
      description: 'Фиксированные платежи без показаний',
    },
  ];

  private readonly storage = inject(StorageService);

  private readonly objectsSignal = signal<MeterObject[]>([]);
  private readonly resourcesSignal = signal<ResourceEntity[]>([]);
  private readonly tariffsSignal = signal<TariffHistoryEntry[]>([]);
  private readonly readingsSignal = signal<MeterReading[]>([]);

  readonly objects = computed(() => this.objectsSignal());
  readonly resources = computed(() => this.resourcesSignal());
  readonly tariffs = computed(() => this.tariffsSignal());
  readonly readings = computed(() => this.readingsSignal());

  readonly typeOptions = this.typeOptionsInternal;

  readonly objectOptions = computed(() => this.objectsSignal().map((o) => o.name));

  readonly readingList = computed<MeterReadingListItem[]>(() => {
    const readings = this.readingsSignal();
    const resources = this.resourcesSignal();
    const objects = this.objectsSignal();
    const tariffs = this.tariffsSignal();

    return [...readings]
      .sort((a, b) => compareDatesDesc(a.submittedAt, b.submittedAt))
      .map((reading) => {
        const resource = resources.find((item) => item.id === reading.resourceId);
        const object = objects.find((item) => item.id === reading.objectId);
        if (!resource || !object) {
          return null as unknown as MeterReadingListItem;
        }

        const previous = this.getPreviousReadingBefore(resource.id, reading.submittedAt, reading.id);
        const consumption = this.calculateConsumption(resource, reading, previous);
        const { cost, currency } = this.calculateCost(resource, consumption, tariffs, reading.submittedAt);

        return {
          id: reading.id,
          objectName: object.name,
          resourceId: resource.id,
          resourceName: resource.name,
          type: resource.type,
          typeLabel: this.typeLabel(resource.type),
          submittedAt: reading.submittedAt,
          unit: resource.unit,
          zones: resource.zones.map((zone) => ({
            id: zone.id,
            label: zone.name,
            value: this.getZoneValue(reading.values, zone.id),
            previous: previous ? this.getZoneValue(previous.values, zone.id) : null,
            consumption: consumption.get(zone.id) ?? 0,
          })),
          cost,
          currency,
        } satisfies MeterReadingListItem;
      })
      .filter((item) => item !== null);
  });

  readonly selectedMonth = signal<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  readonly groupedReadings = computed<GroupedObject[]>(() => {
    const month = this.selectedMonth();
    const allReadings = this.readingList();

    const filtered = allReadings.filter(r => r.submittedAt.startsWith(month));

    const groups = new Map<string, GroupedObject>();

    filtered.forEach(reading => {
      let group = groups.get(reading.objectName);
      if (!group) {
        group = {
          objectName: reading.objectName,
          totalCost: 0,
          currency: reading.currency,
          readings: []
        };
        groups.set(reading.objectName, group);
      }

      group.totalCost += reading.cost ?? 0;
      group.readings.push(reading);
    });

    return Array.from(groups.values()).sort((a, b) => a.objectName.localeCompare(b.objectName));
  });

  setMonth(month: string): void {
    this.selectedMonth.set(month);
  }

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    const [objects, resources, readings, tariffs] = await Promise.all([
      this.storage.getMeterObjects(),
      this.storage.getMeterResources(),
      this.storage.getMeterReadingsV2(),
      this.storage.getTariffs()
    ]);

    this.objectsSignal.set(objects);
    this.resourcesSignal.set(resources as any);
    this.readingsSignal.set(readings as any);
    this.tariffsSignal.set(tariffs as any);
  }

  getDefaultObjectId(): string | undefined {
    return this.objectsSignal()[0]?.id;
  }

  reset(): void {
    this.objectsSignal.set([]);
    this.resourcesSignal.set([]);
    this.tariffsSignal.set([]);
    this.readingsSignal.set([]);
    void this.refresh();
  }

  typeLabel(type: ResourceType): string {
    return this.typeOptionsInternal.find((option) => option.type === type)?.label ?? type;
  }

  typeIcon(type: ResourceType): string {
    return this.typeOptionsInternal.find((option) => option.type === type)?.icon ?? 'category';
  }

  typeDescription(type: ResourceType): string {
    return this.typeOptionsInternal.find((option) => option.type === type)?.description ?? '';
  }

  getObjectById(id: string): MeterObject | undefined {
    return this.objectsSignal().find((object) => object.id === id);
  }

  getObjectByName(name: string): MeterObject | undefined {
    return this.objectsSignal().find((object) => object.name === name.trim());
  }

  ensureObject(name: string): MeterObject {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Object name cannot be empty');
    }

    const existing = this.getObjectByName(trimmed);
    if (existing) {
      return existing;
    }

    const created: MeterObject = {
      id: this.generateId('OBJ'),
      name: trimmed,
    };

    void this.storage.addMeterObject(created);
    this.objectsSignal.update(current => [...current, created]);
    return created;
  }

  getResourcesForObject(objectId: string): ResourceEntity[] {
    return this.resourcesSignal().filter((resource) => resource.objectId === objectId);
  }

  getResourceById(id: string): ResourceEntity | undefined {
    return this.resourcesSignal().find((resource) => resource.id === id);
  }

  getReadingById(id: string): MeterReading | undefined {
    return this.readingsSignal().find((reading) => reading.id === id);
  }

  getReadingsForResource(resourceId: string): MeterReading[] {
    return this.readingsSignal()
      .filter((reading) => reading.resourceId === resourceId)
      .sort((a, b) => compareDatesDesc(a.submittedAt, b.submittedAt));
  }

  getResourceSummary(id: string): ResourceSummary | undefined {
    const resource = this.getResourceById(id);
    if (!resource) {
      return undefined;
    }

    const object = this.getObjectById(resource.objectId);
    if (!object) {
      return undefined;
    }

    const currentTariffs = this.getActiveTariffs(resource.id, new Date().toISOString().slice(0, 10));
    return { resource, object, currentTariffs };
  }

  getTariffHistory(resourceId: string): TariffHistoryEntry[] {
    return this.tariffsSignal()
      .filter((tariff) => tariff.resourceId === resourceId)
      .sort((a, b) => compareDatesDesc(a.effectiveFrom, b.effectiveFrom));
  }

  getPreviousReading(resourceId: string, excludeId?: string): MeterReading | undefined {
    return this.readingsSignal()
      .filter((reading) => reading.resourceId === resourceId && reading.id !== excludeId)
      .sort((a, b) => compareDatesDesc(a.submittedAt, b.submittedAt))[0];
  }

  getPreviousReadingBefore(resourceId: string, submittedAt: string, excludeId?: string): MeterReading | undefined {
    return this.readingsSignal()
      .filter(
        (reading) =>
          reading.resourceId === resourceId &&
          reading.id !== excludeId &&
          reading.submittedAt <= submittedAt
      )
      .sort((a, b) => {
        const dateCompare = compareDatesDesc(a.submittedAt, b.submittedAt);
        if (dateCompare !== 0) return dateCompare;
        // If same date, use ID or some other stable criteria to avoid self if date matches
        // but since we already filtered by id !== excludeId, we just need stability
        return b.id.localeCompare(a.id);
      })[0];
  }

  estimatePeriodSummary(
    resourceId: string,
    values: MeterReadingValue[],
    submittedAt: string,
    excludeId?: string
  ): {
    previous?: MeterReading;
    consumption: Map<string, number>;
    cost?: number;
    currency?: string;
  } {
    const resource = this.getResourceById(resourceId);
    if (!resource) {
      return { previous: undefined, consumption: new Map() };
    }

    const previous = this.getPreviousReadingBefore(resourceId, submittedAt, excludeId);
    const current: MeterReading = {
      id: excludeId ?? 'TEMP',
      objectId: resource.objectId,
      resourceId,
      submittedAt,
      values,
    };

    const consumption = this.calculateConsumption(resource, current, previous);
    const { cost, currency } = this.calculateCost(resource, consumption, this.tariffsSignal(), submittedAt);

    return { previous, consumption, cost, currency };
  }

  upsertReading(payload: UpsertReadingPayload): MeterReading {
    const normalisedValues = payload.values.map((value) => ({
      zone_id: (value as any).zone_id || value.zoneId, // Compatibility check
      zoneId: value.zoneId,
      value: Number(value.value ?? 0),
    }));

    if (payload.id) {
      const readings = this.readingsSignal();
      const index = readings.findIndex((reading) => reading.id === payload.id);
      if (index !== -1) {
        const updated: MeterReading = {
          ...readings[index],
          objectId: payload.objectId,
          resourceId: payload.resourceId,
          submittedAt: payload.submittedAt,
          values: normalisedValues,
        };

        void this.storage.updateMeterReadingV2(payload.id, updated);
        this.readingsSignal.update(current =>
          current.map(r => r.id === payload.id ? updated : r)
        );
        return updated;
      }
    }

    const created: MeterReading = {
      id: this.generateId('MTR'),
      objectId: payload.objectId,
      resourceId: payload.resourceId,
      submittedAt: payload.submittedAt,
      values: normalisedValues,
    };

    void this.storage.addMeterReadingV2(created);
    this.readingsSignal.update(current => [...current, created]);
    return created;
  }

  upsertResource(payload: UpsertResourcePayload): ResourceEntity {
    const targetObject = this.ensureObject(payload.objectName);
    const zones = payload.zones.length ? payload.zones : [{ id: 'total', name: 'Общий счётчик' }];

    if (payload.id) {
      const resources = this.resourcesSignal();
      const index = resources.findIndex((resource) => resource.id === payload.id);
      if (index !== -1) {
        const updated: ResourceEntity = {
          ...resources[index],
          objectId: targetObject.id,
          type: payload.type,
          name: payload.name.trim(),
          unit: payload.unit,
          pricingModel: payload.pricingModel,
          zones,
          initialValues: payload.initialValues,
          fixedAmount: payload.fixedAmount,
          fixedCurrency: payload.fixedCurrency,
        };

        void this.storage.updateMeterResource(payload.id, updated);
        this.resourcesSignal.update(current =>
          current.map(r => r.id === payload.id ? updated : r)
        );
        return updated;
      }
    }

    const created: ResourceEntity = {
      id: this.generateId('RES'),
      objectId: targetObject.id,
      type: payload.type,
      name: payload.name.trim(),
      unit: payload.unit,
      pricingModel: payload.pricingModel,
      zones,
      initialValues: payload.initialValues,
      fixedAmount: payload.fixedAmount,
      fixedCurrency: payload.fixedCurrency,
    };

    void this.storage.addMeterResource(created);
    this.resourcesSignal.update(current => [...current, created]);
    return created;
  }

  deleteResource(resourceId: string): void {
    void this.storage.deleteMeterResource(resourceId);
    this.resourcesSignal.update(current => current.filter(r => r.id !== resourceId));

    const relatedReadings = this.readingsSignal().filter((reading) => reading.resourceId === resourceId);
    relatedReadings.forEach(r => void this.storage.deleteMeterReadingV2(r.id));

    this.readingsSignal.update(current => current.filter((reading) => reading.resourceId !== resourceId));
    this.tariffsSignal.update(current => current.filter((tariff) => tariff.resourceId !== resourceId));
  }

  addTariff(payload: AddTariffPayload): TariffHistoryEntry {
    const tariff: TariffHistoryEntry = {
      ...payload,
      id: this.generateId('TRF'),
    };

    void this.storage.addTariff(tariff);
    this.tariffsSignal.update(current => [...current, tariff]);
    return tariff;
  }

  removeTariff(tariffId: string): void {
    void this.storage.deleteTariff(tariffId);
    this.tariffsSignal.update(current => current.filter(t => t.id !== tariffId));
  }

  getActiveTariffs(resourceId: string, atDate: string): TariffHistoryEntry[] {
    const resource = this.getResourceById(resourceId);
    if (!resource) {
      return [];
    }

    const relevant = this.tariffsSignal()
      .filter((tariff) => tariff.resourceId === resourceId && tariff.effectiveFrom <= atDate)
      .sort((a, b) => compareDatesDesc(a.effectiveFrom, b.effectiveFrom));

    const result: TariffHistoryEntry[] = [];
    const generalTariff = relevant.find((tariff) => !tariff.zoneId);

    if (generalTariff) {
      result.push(generalTariff);
    }

    for (const zone of resource.zones) {
      const zoneTariff = relevant.find((tariff) => tariff.zoneId === zone.id);
      if (zoneTariff) {
        result.push(zoneTariff);
      }
    }

    return result;
  }

  calculateConsumption(resource: ResourceEntity, current: MeterReading, previous?: MeterReading): Map<string, number> {
    const mapResult = new Map<string, number>();

    for (const value of current.values) {
      let previousValue = 0;
      if (previous) {
        previousValue = previous.values.find((item) => item.zoneId === value.zoneId)?.value ?? 0;
      } else if (resource.initialValues) {
        previousValue = resource.initialValues.find((item) => item.zoneId === value.zoneId)?.value ?? 0;
      }

      mapResult.set(value.zoneId, Math.max(0, Number(value.value) - Number(previousValue)));
    }

    return mapResult;
  }

  private getZoneValue(values: MeterReadingValue[], zoneId: string): number {
    return values.find((value) => value.zoneId === zoneId)?.value ?? 0;
  }

  private calculateCost(
    resource: ResourceEntity,
    consumption: Map<string, number>,
    tariffs: TariffHistoryEntry[],
    submittedAt: string
  ): { cost?: number; currency?: string } {
    const relevantTariffs = tariffs
      .filter((tariff) => tariff.resourceId === resource.id && tariff.effectiveFrom <= submittedAt)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

    if (resource.pricingModel === 'fixed') {
      if (resource.fixedAmount !== undefined) {
        return { cost: resource.fixedAmount, currency: resource.fixedCurrency ?? resource.unit };
      }

      const tariff = relevantTariffs.find((entry) => !entry.zoneId);
      return tariff
        ? { cost: tariff.price, currency: tariff.currency }
        : { cost: undefined, currency: undefined };
    }

    let total = 0;
    let currency: string | undefined;

    const generalTariff = relevantTariffs.find((entry) => !entry.zoneId);

    if (generalTariff) {
      currency = generalTariff.currency;
      total = [...consumption.values()].reduce((sum, value) => sum + value, 0) * generalTariff.price;
      return { cost: Number(total.toFixed(2)), currency };
    }

    let usedTariff = false;

    for (const zone of resource.zones) {
      const tariff = relevantTariffs.find((entry) => entry.zoneId === zone.id);
      if (!tariff) {
        continue;
      }

      usedTariff = true;
      currency = tariff.currency;
      total += (consumption.get(zone.id) ?? 0) * tariff.price;
    }

    if (!usedTariff) {
      return { cost: undefined, currency: undefined };
    }

    return { cost: Number(total.toFixed(2)), currency };
  }

  private sortReadings(readings: MeterReading[]): MeterReading[] {
    return readings.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  private generateId(prefix: string): string {
    const randomPart = Math.floor(Math.random() * 1_000).toString().padStart(3, '0');
    const timestampPart = Date.now().toString(36).toUpperCase();
    return `${prefix}-${timestampPart}-${randomPart}`;
  }
}
