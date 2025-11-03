import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SharedModule } from '../../../shared/shared-module';
import { MeterType } from '../../models/meter-reading';
import {
  MeterObject,
  ResourceEntity,
  ResourcePricingModel,
  ResourceZone,
  TariffHistoryEntry,
} from '../../models/resource';
import {
  AddTariffPayload,
  MetersStoreService,
  UpsertResourcePayload,
} from '../../services/meters-store.service';

interface ResourceFormModel {
  id?: string;
  objectName: string;
  type: MeterType;
  name: string;
  pricingModel: ResourcePricingModel;
  zoneTemplate: 'single' | 'double' | 'triple';
  unit: string;
}

interface TariffFormModel {
  resourceId?: string;
  zoneId?: string;
  price: number;
  currency: string;
  effectiveFrom: string;
  description?: string;
}

interface ResourceListView {
  entity: ResourceEntity;
  objectName: string;
  typeLabel: string;
  zoneSummary: string;
  pricingLabel: string;
}

@Component({
  selector: 'app-meters-resources',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-resources.component.html',
  styleUrls: ['./meters-resources.component.scss'],
})
export class MetersResourcesComponent {
  private readonly store = inject(MetersStoreService);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeOptions = this.store.typeOptions;
  readonly zoneTemplates = [
    { value: 'single', label: 'Однозонный учёт' },
    { value: 'double', label: 'День / Ночь' },
    { value: 'triple', label: 'Три зоны (пик/полупик/ночь)' },
  ] as const;

  readonly pricingModels: { value: ResourcePricingModel; label: string }[] = [
    { value: 'per_unit', label: 'По показаниям счётчика' },
    { value: 'fixed', label: 'Фиксированная сумма в месяц' },
  ];

  readonly resources$ = combineLatest([this.store.resources$, this.store.objects$]).pipe(
    map(([resources, objects]) => this.mapToResourceView(resources, objects))
  );

  readonly objectOptions$ = this.store.objects$;

  resourceForm: ResourceFormModel = this.createDefaultResourceForm();
  tariffForm: TariffFormModel = this.createDefaultTariffForm();

  selectedResourceId?: string;
  tariffHistory: TariffHistoryEntry[] = [];

  constructor() {
    this.store.tariffs$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshTariffHistory();
      });
  }

  get selectedResource(): ResourceEntity | undefined {
    return this.selectedResourceId ? this.store.getResourceById(this.selectedResourceId) : undefined;
  }

  get zoneOptions(): { id: string | undefined; label: string }[] {
    const resource = this.selectedResource;
    if (!resource) {
      return [];
    }

    const options = resource.zones.map((zone) => ({ id: zone.id as string | undefined, label: zone.name }));

    if (resource.pricingModel === 'per_unit') {
      options.unshift({ id: undefined, label: 'Общий тариф' });
    }

    if (resource.pricingModel === 'fixed') {
      return [{ id: undefined, label: 'Ежемесячная оплата' }];
    }

    return options;
  }

  trackResource(_: number, resource: ResourceListView): string {
    return resource.entity.id;
  }

  trackObject(_: number, object: MeterObject): string {
    return object.id;
  }

  trackTariff(_: number, tariff: TariffHistoryEntry): string {
    return tariff.id;
  }

  selectForTariffs(resource: ResourceEntity): void {
    this.selectedResourceId = resource.id;
    this.tariffForm = {
      ...this.createDefaultTariffForm(),
      resourceId: resource.id,
    };
    this.refreshTariffHistory();
  }

  editResource(resource: ResourceEntity, objectName: string): void {
    this.resourceForm = {
      id: resource.id,
      objectName,
      type: resource.type,
      name: resource.name,
      pricingModel: resource.pricingModel,
      zoneTemplate: this.detectTemplate(resource),
      unit: resource.unit,
    };
    this.selectForTariffs(resource);
  }

  resetResourceForm(): void {
    this.resourceForm = this.createDefaultResourceForm();
  }

  onTypeChange(type: MeterType): void {
    this.resourceForm.type = type;
    const option = this.typeOptions.find((item) => item.type === type);
    if (option) {
      this.resourceForm.unit = option.unit;
    }

    if (type !== 'electricity') {
      this.resourceForm.zoneTemplate = 'single';
    }
  }

  onPricingModelChange(model: ResourcePricingModel): void {
    this.resourceForm.pricingModel = model;
    if (model === 'fixed') {
      this.resourceForm.zoneTemplate = 'single';
    }
  }

  saveResource(): void {
    if (!this.resourceForm.objectName.trim() || !this.resourceForm.name.trim()) {
      return;
    }

    const zones = this.buildZones(this.resourceForm);

    const payload: UpsertResourcePayload = {
      id: this.resourceForm.id,
      objectName: this.resourceForm.objectName,
      type: this.resourceForm.type,
      name: this.resourceForm.name,
      unit: this.resourceForm.unit,
      pricingModel: this.resourceForm.pricingModel,
      zones,
    };

    const saved = this.store.upsertResource(payload);
    this.selectForTariffs(saved);
    this.resourceForm = this.createDefaultResourceForm();
  }

  deleteResource(resource: ResourceEntity): void {
    if (this.selectedResourceId === resource.id) {
      this.selectedResourceId = undefined;
      this.tariffForm = this.createDefaultTariffForm();
      this.tariffHistory = [];
    }

    this.store.deleteResource(resource.id);
  }

  saveTariff(): void {
    if (!this.tariffForm.resourceId) {
      return;
    }

    const payload: AddTariffPayload = {
      resourceId: this.tariffForm.resourceId,
      zoneId: this.tariffForm.zoneId,
      price: Number(this.tariffForm.price),
      currency: this.tariffForm.currency,
      effectiveFrom: this.tariffForm.effectiveFrom,
      description: this.tariffForm.description?.trim() || undefined,
    };

    this.store.addTariff(payload);
    this.tariffForm = {
      ...this.createDefaultTariffForm(),
      resourceId: this.selectedResourceId,
    };
    this.refreshTariffHistory();
  }

  removeTariff(tariff: TariffHistoryEntry): void {
    this.store.removeTariff(tariff.id);
    this.refreshTariffHistory();
  }

  typeLabel(type: MeterType): string {
    return this.store.typeLabel(type);
  }

  zoneName(zoneId?: string): string {
    const resource = this.selectedResource;
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

  currentTariffs(resource: ResourceEntity): TariffHistoryEntry[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.store.getActiveTariffs(resource.id, today);
  }

  private refreshTariffHistory(): void {
    if (!this.selectedResourceId) {
      this.tariffHistory = [];
      return;
    }

    this.tariffHistory = this.store.getTariffHistory(this.selectedResourceId);
  }

  private mapToResourceView(resources: ResourceEntity[], objects: MeterObject[]): ResourceListView[] {
    return resources.map((resource) => ({
      entity: resource,
      objectName: objects.find((object) => object.id === resource.objectId)?.name ?? 'Неизвестный объект',
      typeLabel: this.store.typeLabel(resource.type),
      zoneSummary: resource.zones.map((zone) => zone.name).join(', '),
      pricingLabel:
        resource.pricingModel === 'fixed' ? 'Фиксировано' : `${resource.zones.length} ${this.pluralizeZones(resource.zones.length)}`,
    }));
  }

  private detectTemplate(resource: ResourceEntity): ResourceFormModel['zoneTemplate'] {
    if (resource.type !== 'electricity') {
      return 'single';
    }

    switch (resource.zones.length) {
      case 2:
        return 'double';
      case 3:
        return 'triple';
      default:
        return 'single';
    }
  }

  private buildZones(form: ResourceFormModel): ResourceZone[] {
    if (form.pricingModel === 'fixed') {
      return [{ id: 'fixed', name: 'Абонентская плата' }];
    }

    if (form.type !== 'electricity') {
      return [{ id: 'total', name: 'Общий счётчик' }];
    }

    switch (form.zoneTemplate) {
      case 'double':
        return [
          { id: 'day', name: 'День' },
          { id: 'night', name: 'Ночь' },
        ];
      case 'triple':
        return [
          { id: 'peak', name: 'Пик' },
          { id: 'half-peak', name: 'Полупик' },
          { id: 'night', name: 'Ночь' },
        ];
      default:
        return [{ id: 'total', name: 'Общий счётчик' }];
    }
  }

  private createDefaultResourceForm(): ResourceFormModel {
    const defaultType = this.typeOptions[0];
    return {
      objectName: '',
      type: defaultType.type,
      name: '',
      pricingModel: 'per_unit',
      zoneTemplate: 'single',
      unit: defaultType.unit,
    };
  }

  private createDefaultTariffForm(): TariffFormModel {
    return {
      resourceId: this.selectedResourceId,
      zoneId: undefined,
      price: 0,
      currency: '₽',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      description: '',
    };
  }

  private pluralizeZones(count: number): string {
    if (count === 1) {
      return 'зона';
    }

    if (count >= 2 && count <= 4) {
      return 'зоны';
    }

    return 'зон';
  }
}
