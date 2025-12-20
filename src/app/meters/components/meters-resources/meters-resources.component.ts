import { Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { SharedModule } from '../../../shared/shared-module';
import {
  MeterObject,
  ResourceEntity,
  ResourcePricingModel,
  ResourceZone,
  TariffHistoryEntry,
} from '../../models/resource';
import { ResourceType } from '../../models/resource-type';
import { AddTariffPayload, UpsertResourcePayload } from '../../services/meters-store.service';
import { MetersStore } from '../../../meters/services/meters-store.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActivatedRoute } from '@angular/router';

interface ResourceFormModel {
  id?: string;
  objectName: string;
  type: ResourceType;
  name: string;
  pricingModel: ResourcePricingModel;
  zoneTemplate: 'single' | 'double' | 'triple';
  unit: string;
  serviceAmount: number | null;
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
  typeIcon: string;
  typeDescription: string;
  isService: boolean;
  zoneSummary: string;
  pricingLabel: string;
  fixedAmount?: number;
  fixedCurrency?: string;
}

@Component({
  selector: 'app-meters-resources',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-resources.component.html',
  styleUrls: ['./meters-resources.component.scss'],
})
export class MetersResourcesComponent implements OnInit {
  private readonly store = inject(MetersStore);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currencyService = inject(CurrencyService);
  private readonly dialog = inject(MatDialog);

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

  readonly resources$ = computed(() => this.mapToResourceView(this.store.resources(), this.store.objects()));

  readonly objectOptions$ = this.store.objects;

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  resourceForm: ResourceFormModel = this.createDefaultResourceForm();
  tariffForm: TariffFormModel = this.createDefaultTariffForm();

  selectedResourceId?: string;
  tariffHistory: TariffHistoryEntry[] = [];

  constructor() {
    // We can use effect() here if we want to react to changes, 
    // but a simple refresh logic is already in the store.
    // If we need to refresh tariff history when store signals change:
  }

  ngOnInit(): void {
    // Any initialization logic that depends on signals or route params can go here
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
      serviceAmount: resource.fixedAmount ?? null,
    };
    this.selectForTariffs(resource);
  }

  resetResourceForm(): void {
    this.resourceForm = this.createDefaultResourceForm();
  }

  onTypeChange(type: ResourceType): void {
    this.resourceForm.type = type;
    const option = this.typeOptions.find((item) => item.type === type);
    if (option) {
      this.resourceForm.unit = option.unit;
    }

    if (type === 'service') {
      this.resourceForm.pricingModel = 'fixed';
      this.resourceForm.serviceAmount = this.resourceForm.serviceAmount ?? 0;
    } else {
      this.resourceForm.serviceAmount = null;
      if (this.resourceForm.pricingModel === 'fixed') {
        this.resourceForm.pricingModel = 'per_unit';
      }
    }

    if (type !== 'electricity' || this.resourceForm.pricingModel === 'fixed') {
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
      fixedAmount:
        this.resourceForm.type === 'service'
          ? Number(this.resourceForm.serviceAmount ?? 0)
          : undefined,
      fixedCurrency:
        this.resourceForm.type === 'service'
          ? this.currencyService.normalizeCode(this.defaultCurrencyCode())
          : undefined,
    };

    const saved = this.store.upsertResource(payload);
    this.selectForTariffs(saved);
    this.resourceForm = this.createDefaultResourceForm();
  }

  deleteResource(resource: ResourceEntity): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Удаление ресурса',
        message: 'Вы уверены, что хотите удалить этот ресурс? Все показания и тарифы будут потеряны.',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (this.selectedResourceId === resource.id) {
          this.selectedResourceId = undefined;
          this.tariffForm = this.createDefaultTariffForm();
          this.tariffHistory = [];
        }

        this.store.deleteResource(resource.id);
      }
    });
  }

  saveTariff(): void {
    if (!this.tariffForm.resourceId) {
      return;
    }

    const payload: AddTariffPayload = {
      resourceId: this.tariffForm.resourceId,
      zoneId: this.tariffForm.zoneId,
      price: Number(this.tariffForm.price),
      currency: this.currencyService.normalizeCode(this.tariffForm.currency),
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Удаление тарифа',
        message: 'Удалить эту запись тарифа?',
        isDestructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.removeTariff(tariff.id);
        this.refreshTariffHistory();
      }
    });
  }

  typeLabel(type: ResourceType): string {
    return this.store.typeLabel(type);
  }

  typeIcon(type: ResourceType): string {
    return this.store.typeIcon(type);
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
    return resources.map((resource) => {
      const objectName = objects.find((object) => object.id === resource.objectId)?.name ?? 'Неизвестный объект';
      const isService = resource.type === 'service';
      const zoneSummary = isService
        ? 'Без счётчика'
        : resource.zones.map((zone) => zone.name).join(', ') || '—';
      const pricingLabel = isService
        ? 'Фиксированная услуга'
        : resource.pricingModel === 'fixed'
          ? 'Фиксированная плата'
          : `${resource.zones.length} ${this.pluralizeZones(resource.zones.length)}`;

      return {
        entity: resource,
        objectName,
        typeLabel: this.store.typeLabel(resource.type),
        typeIcon: this.store.typeIcon(resource.type),
        typeDescription: this.store.typeDescription(resource.type),
        isService,
        zoneSummary,
        pricingLabel,
        fixedAmount: resource.fixedAmount,
        fixedCurrency: resource.fixedCurrency,
      } satisfies ResourceListView;
    });
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
      serviceAmount: null,
    };
  }

  private createDefaultTariffForm(): TariffFormModel {
    return {
      resourceId: this.selectedResourceId,
      zoneId: undefined,
      price: 0,
      currency: this.defaultCurrencyCode(),
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

  formatCurrency(amount: number, currency?: string, fractionDigits = 2): string {
    return this.currencyService.format(amount, currency ?? this.defaultCurrencyCode(), fractionDigits);
  }
}
