import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import {
  MeterReading,
  MeterReadingValue,
  MeterType,
  MeterTypeOption,
} from '../models/meter-reading';
import { MeterObject, ResourceEntity, ResourceSummary, ResourceZone, TariffHistoryEntry } from '../models/resource';

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
}

export interface AddTariffPayload extends Omit<TariffHistoryEntry, 'id'> {}

export interface MeterReadingListItem {
  id: string;
  objectName: string;
  resourceId: string;
  resourceName: string;
  type: MeterType;
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

@Injectable({ providedIn: 'root' })
export class MetersStoreService {
  private readonly typeOptionsInternal: MeterTypeOption[] = [
    { type: 'water', label: 'Вода', unit: 'м³' },
    { type: 'gas', label: 'Газ', unit: 'м³' },
    { type: 'electricity', label: 'Электричество', unit: 'кВт·ч' },
    { type: 'heat', label: 'Отопление', unit: 'Гкал' },
  ];

  private readonly objectsSubject = new BehaviorSubject<MeterObject[]>([
    { id: 'OBJ-001', name: 'Квартира, ул. Ленина 10' },
    { id: 'OBJ-002', name: 'Дом, СНТ Берёзка' },
  ]);

  private readonly resourcesSubject = new BehaviorSubject<ResourceEntity[]>([
    {
      id: 'RES-001',
      objectId: 'OBJ-001',
      type: 'water',
      name: 'Вода (ХВС)',
      unit: 'м³',
      pricingModel: 'per_unit',
      zones: [{ id: 'total', name: 'Общий счётчик' }],
    },
    {
      id: 'RES-002',
      objectId: 'OBJ-001',
      type: 'gas',
      name: 'Газ',
      unit: 'м³',
      pricingModel: 'per_unit',
      zones: [{ id: 'total', name: 'Общий счётчик' }],
    },
    {
      id: 'RES-003',
      objectId: 'OBJ-001',
      type: 'electricity',
      name: 'Электроэнергия (день/ночь)',
      unit: 'кВт·ч',
      pricingModel: 'per_unit',
      zones: [
        { id: 'day', name: 'День' },
        { id: 'night', name: 'Ночь' },
      ],
    },
    {
      id: 'RES-004',
      objectId: 'OBJ-002',
      type: 'electricity',
      name: 'Электроэнергия (три зоны)',
      unit: 'кВт·ч',
      pricingModel: 'per_unit',
      zones: [
        { id: 'peak', name: 'Пик' },
        { id: 'half-peak', name: 'Полупик' },
        { id: 'night', name: 'Ночь' },
      ],
    },
  ]);

  private readonly tariffsSubject = new BehaviorSubject<TariffHistoryEntry[]>([
    {
      id: 'TRF-001',
      resourceId: 'RES-001',
      price: 42.5,
      currency: '₽',
      effectiveFrom: '2024-01-01',
    },
    {
      id: 'TRF-002',
      resourceId: 'RES-002',
      price: 6.8,
      currency: '₽',
      effectiveFrom: '2024-02-01',
    },
    {
      id: 'TRF-003',
      resourceId: 'RES-003',
      zoneId: 'day',
      price: 5.15,
      currency: '₽',
      effectiveFrom: '2024-03-01',
      description: 'Дневной тариф',
    },
    {
      id: 'TRF-004',
      resourceId: 'RES-003',
      zoneId: 'night',
      price: 2.75,
      currency: '₽',
      effectiveFrom: '2024-03-01',
      description: 'Ночной тариф',
    },
    {
      id: 'TRF-005',
      resourceId: 'RES-004',
      zoneId: 'peak',
      price: 6.1,
      currency: '₽',
      effectiveFrom: '2024-01-01',
    },
    {
      id: 'TRF-006',
      resourceId: 'RES-004',
      zoneId: 'half-peak',
      price: 4.7,
      currency: '₽',
      effectiveFrom: '2024-01-01',
    },
    {
      id: 'TRF-007',
      resourceId: 'RES-004',
      zoneId: 'night',
      price: 2.2,
      currency: '₽',
      effectiveFrom: '2024-01-01',
    },
  ]);

  private readonly readingsSubject = new BehaviorSubject<MeterReading[]>([
    {
      id: 'MTR-001',
      objectId: 'OBJ-001',
      resourceId: 'RES-001',
      submittedAt: '2024-02-01',
      values: [{ zoneId: 'total', value: 108.3 }],
    },
    {
      id: 'MTR-002',
      objectId: 'OBJ-001',
      resourceId: 'RES-001',
      submittedAt: '2024-03-01',
      values: [{ zoneId: 'total', value: 112.5 }],
    },
    {
      id: 'MTR-003',
      objectId: 'OBJ-001',
      resourceId: 'RES-002',
      submittedAt: '2024-03-01',
      values: [{ zoneId: 'total', value: 342 }],
    },
    {
      id: 'MTR-004',
      objectId: 'OBJ-001',
      resourceId: 'RES-003',
      submittedAt: '2024-02-01',
      values: [
        { zoneId: 'day', value: 1450 },
        { zoneId: 'night', value: 620 },
      ],
    },
    {
      id: 'MTR-005',
      objectId: 'OBJ-001',
      resourceId: 'RES-003',
      submittedAt: '2024-03-01',
      values: [
        { zoneId: 'day', value: 1520 },
        { zoneId: 'night', value: 655 },
      ],
    },
    {
      id: 'MTR-006',
      objectId: 'OBJ-002',
      resourceId: 'RES-004',
      submittedAt: '2024-03-05',
      values: [
        { zoneId: 'peak', value: 920 },
        { zoneId: 'half-peak', value: 510 },
        { zoneId: 'night', value: 310 },
      ],
    },
  ]);

  readonly objects$ = this.objectsSubject.asObservable();
  readonly resources$ = this.resourcesSubject.asObservable();
  readonly tariffs$ = this.tariffsSubject.asObservable();
  readonly readings$ = this.readingsSubject.asObservable();

  readonly typeOptions = this.typeOptionsInternal;

  readonly objectOptions$ = this.objects$.pipe(map((objects) => objects.map((object) => object.name)));

  readonly readingList$ = combineLatest([
    this.readings$,
    this.resources$,
    this.objects$,
    this.tariffs$,
  ]).pipe(
    map(([readings, resources, objects, tariffs]) =>
      readings
        .slice()
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map((reading) => {
          const resource = resources.find((item) => item.id === reading.resourceId);
          const object = objects.find((item) => item.id === reading.objectId);
          if (!resource || !object) {
            throw new Error('Reading references unknown object or resource');
          }

          const previous = this.getPreviousReading(resource.id, reading.id);
          const consumption = this.calculateConsumption(reading, previous);
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
    )
  );

  getDefaultObjectId(): string | undefined {
    return this.objectsSubject.value[0]?.id;
  }

  typeLabel(type: MeterType): string {
    return this.typeOptionsInternal.find((option) => option.type === type)?.label ?? type;
  }

  getObjectById(id: string): MeterObject | undefined {
    return this.objectsSubject.value.find((object) => object.id === id);
  }

  getObjectByName(name: string): MeterObject | undefined {
    return this.objectsSubject.value.find((object) => object.name === name.trim());
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

    this.objectsSubject.next([...this.objectsSubject.value, created]);
    return created;
  }

  getResourcesForObject(objectId: string): ResourceEntity[] {
    return this.resourcesSubject.value.filter((resource) => resource.objectId === objectId);
  }

  getResourceById(id: string): ResourceEntity | undefined {
    return this.resourcesSubject.value.find((resource) => resource.id === id);
  }

  getReadingById(id: string): MeterReading | undefined {
    return this.readingsSubject.value.find((reading) => reading.id === id);
  }

  getReadingsForResource(resourceId: string): MeterReading[] {
    return this.readingsSubject.value
      .filter((reading) => reading.resourceId === resourceId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
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
    return this.tariffsSubject.value
      .filter((tariff) => tariff.resourceId === resourceId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  }

  getPreviousReading(resourceId: string, excludeId?: string): MeterReading | undefined {
    return this.readingsSubject.value
      .filter((reading) => reading.resourceId === resourceId && reading.id !== excludeId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  }

  getPreviousReadingBefore(resourceId: string, submittedAt: string, excludeId?: string): MeterReading | undefined {
    return this.readingsSubject.value
      .filter(
        (reading) =>
          reading.resourceId === resourceId &&
          reading.id !== excludeId &&
          reading.submittedAt <= submittedAt
      )
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
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

    const consumption = this.calculateConsumption(current, previous);
    const { cost, currency } = this.calculateCost(resource, consumption, this.tariffsSubject.value, submittedAt);

    return { previous, consumption, cost, currency };
  }

  upsertReading(payload: UpsertReadingPayload): MeterReading {
    const readings = [...this.readingsSubject.value];
    const normalisedValues = payload.values.map((value) => ({
      zoneId: value.zoneId,
      value: Number(value.value ?? 0),
    }));

    if (payload.id) {
      const index = readings.findIndex((reading) => reading.id === payload.id);
      if (index !== -1) {
        const updated: MeterReading = {
          ...readings[index],
          objectId: payload.objectId,
          resourceId: payload.resourceId,
          submittedAt: payload.submittedAt,
          values: normalisedValues,
        };
        readings[index] = updated;
        this.readingsSubject.next(this.sortReadings(readings));
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

    readings.push(created);
    this.readingsSubject.next(this.sortReadings(readings));
    return created;
  }

  upsertResource(payload: UpsertResourcePayload): ResourceEntity {
    const targetObject = this.ensureObject(payload.objectName);
    const zones = payload.zones.length ? payload.zones : [{ id: 'total', name: 'Общий счётчик' }];
    const resources = [...this.resourcesSubject.value];

    if (payload.id) {
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
        };
        resources[index] = updated;
        this.resourcesSubject.next(resources);
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
    };

    resources.push(created);
    this.resourcesSubject.next(resources);
    return created;
  }

  deleteResource(resourceId: string): void {
    const resources = this.resourcesSubject.value.filter((resource) => resource.id !== resourceId);
    this.resourcesSubject.next(resources);
    this.readingsSubject.next(this.readingsSubject.value.filter((reading) => reading.resourceId !== resourceId));
    this.tariffsSubject.next(this.tariffsSubject.value.filter((tariff) => tariff.resourceId !== resourceId));
  }

  addTariff(payload: AddTariffPayload): TariffHistoryEntry {
    const tariff: TariffHistoryEntry = {
      ...payload,
      id: this.generateId('TRF'),
    };

    this.tariffsSubject.next([...this.tariffsSubject.value, tariff]);
    return tariff;
  }

  removeTariff(tariffId: string): void {
    this.tariffsSubject.next(this.tariffsSubject.value.filter((tariff) => tariff.id !== tariffId));
  }

  getActiveTariffs(resourceId: string, atDate: string): TariffHistoryEntry[] {
    const resource = this.getResourceById(resourceId);
    if (!resource) {
      return [];
    }

    const relevant = this.tariffsSubject.value
      .filter((tariff) => tariff.resourceId === resourceId && tariff.effectiveFrom <= atDate)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

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

  calculateConsumption(current: MeterReading, previous?: MeterReading): Map<string, number> {
    const mapResult = new Map<string, number>();

    for (const value of current.values) {
      const previousValue = previous?.values.find((item) => item.zoneId === value.zoneId)?.value ?? 0;
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
