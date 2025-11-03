import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MeterReading, MeterType, MeterTypeOption } from '../models/meter-reading';

type UpsertReadingPayload = Omit<MeterReading, 'id'> & { id?: string };

@Injectable({ providedIn: 'root' })
export class MetersStoreService {
  private readonly typeOptionsInternal: MeterTypeOption[] = [
    { type: 'water', label: 'Вода', unit: 'м³' },
    { type: 'gas', label: 'Газ', unit: 'м³' },
    { type: 'electricity', label: 'Электричество', unit: 'кВт·ч' },
  ];

  private readonly readingsSubject = new BehaviorSubject<MeterReading[]>([
    { id: 'MTR-001', object: 'Квартира, ул. Ленина 10', type: 'water', value: 112.5, unit: 'м³', submittedAt: '2024-03-01' },
    { id: 'MTR-002', object: 'Квартира, ул. Ленина 10', type: 'electricity', value: 2150, unit: 'кВт·ч', submittedAt: '2024-03-01' },
    { id: 'MTR-003', object: 'Дом, СНТ Берёзка', type: 'gas', value: 342, unit: 'м³', submittedAt: '2024-03-05' },
  ]);

  private readonly objectOptionsSubject = new BehaviorSubject<string[]>([...new Set(this.readingsSubject.value.map((reading) => reading.object))]);

  readonly readings$ = this.readingsSubject.asObservable();
  readonly objectOptions$ = this.objectOptionsSubject.asObservable();
  readonly typeOptions = this.typeOptionsInternal;

  getDefaultObject(): string {
    return this.objectOptionsSubject.value[0] ?? 'Новый объект';
  }

  typeLabel(type: MeterType): string {
    return this.typeOptionsInternal.find((option) => option.type === type)?.label ?? type;
  }

  defaultUnit(type: MeterType): string {
    return this.typeOptionsInternal.find((option) => option.type === type)?.unit ?? '';
  }

  getReadingById(id: string): MeterReading | undefined {
    return this.readingsSubject.value.find((reading) => reading.id === id);
  }

  upsertReading(payload: UpsertReadingPayload): MeterReading {
    const readings = [...this.readingsSubject.value];

    if (payload.id) {
      const index = readings.findIndex((reading) => reading.id === payload.id);
      if (index !== -1) {
        const updated: MeterReading = { ...readings[index], ...payload } as MeterReading;
        readings[index] = updated;
        this.readingsSubject.next(readings);
        this.ensureObjectOption(updated.object);
        return updated;
      }
    }

    const created: MeterReading = {
      ...payload,
      id: this.generateId(),
      unit: payload.unit || this.defaultUnit(payload.type),
    } as MeterReading;

    readings.unshift(created);
    this.readingsSubject.next(readings);
    this.ensureObjectOption(created.object);
    return created;
  }

  private ensureObjectOption(objectName: string): void {
    const current = this.objectOptionsSubject.value;
    if (current.includes(objectName)) {
      return;
    }

    this.objectOptionsSubject.next([...current, objectName]);
  }

  private generateId(): string {
    const randomPart = Math.floor(Math.random() * 1_000).toString().padStart(3, '0');
    const timestampPart = Date.now().toString(36).toUpperCase();
    return `MTR-${timestampPart}-${randomPart}`;
  }
}
