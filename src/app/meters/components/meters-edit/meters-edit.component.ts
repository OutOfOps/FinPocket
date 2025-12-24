import { Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SharedModule } from '../../../shared/shared-module';
import { MeterReadingValue } from '../../models/meter-reading';
import { ResourceEntity, ResourceZone, TariffHistoryEntry } from '../../models/resource';
import { MetersStore } from '../../services/meters-store.service';
import { CurrencyService } from '../../../core/services/currency.service';

interface MeterForm {
  id?: string;
  objectName: string;
  objectId?: string;
  resourceId?: string;
  submittedAt: string;
  values: Record<string, number>;
}

interface ZoneViewModel {
  zone: ResourceZone;
  current: number;
  previous?: number;
  consumption: number;
}

@Component({
  selector: 'app-meters-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-edit.component.html',
  styleUrls: ['./meters-edit.component.scss'],
})
export class MetersEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(MetersStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currencyService = inject(CurrencyService);

  objects: any[] = [];
  objectOptions: string[] = [];
  isEditMode = false;
  form: MeterForm = this.createDefaultForm();
  resources: ResourceEntity[] = [];
  selectedResource?: ResourceEntity;
  activeTariffs: TariffHistoryEntry[] = [];
  tariffHistory: TariffHistoryEntry[] = [];
  consumption = new Map<string, number>();
  previousValues: Record<string, number> = {};
  estimatedCost?: number;
  estimatedCurrency?: string;
  previousReadingDate?: string;

  readonly defaultCurrencyCode = computed(() => this.currencyService.getDefaultCurrencyCode());

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        this.isEditMode = !!id;

        if (id) {
          this.patchFromExisting(id);
        } else {
          this.form = this.createDefaultForm();
          this.updateObjectBinding(this.form.objectName);
          this.syncResources();
          this.recalculateSummary();
        }
      });
  }

  ngOnInit(): void {
    this.objects = this.store.objects();
    this.objectOptions = this.store.objectOptions();
  }

  submit(): void {
    if (!this.selectedResource || !this.form.resourceId) {
      return;
    }

    const object = this.store.ensureObject(this.form.objectName);
    const values = this.selectedResource.zones.map<MeterReadingValue>((zone) => ({
      zoneId: zone.id,
      value: Number(this.form.values[zone.id] ?? 0),
    }));

    const saved = this.store.upsertReading({
      id: this.form.id,
      objectId: object.id,
      resourceId: this.form.resourceId,
      submittedAt: this.form.submittedAt,
      values,
    });

    this.form = {
      id: saved.id,
      objectName: object.name,
      objectId: object.id,
      resourceId: saved.resourceId,
      submittedAt: saved.submittedAt,
      values: values.reduce<Record<string, number>>((acc, current) => {
        acc[current.zoneId] = current.value;
        return acc;
      }, {}),
    };

    this.router.navigate(['../list'], { relativeTo: this.route });
  }

  trackObject(_: number, option: { id: string; name: string }): string {
    return option.id;
  }

  trackZone(_: number, zone: ZoneViewModel): string {
    return zone.zone.id;
  }

  handleObjectChange(name: string): void {
    this.updateObjectBinding(name);
    this.syncResources();
    this.recalculateSummary();
  }

  handleResourceChange(resourceId: string): void {
    this.form.resourceId = resourceId;
    this.selectedResource = this.store.getResourceById(resourceId);
    this.ensureZoneValues();
    this.refreshTariffs();
    this.recalculateSummary();
  }

  handleDateChange(date: string): void {
    this.form.submittedAt = date;
    this.recalculateSummary();
  }

  updateZoneValue(zoneId: string, value: number): void {
    if (typeof zoneId === 'string' && Object.hasOwn(this.form.values, zoneId)) {
      this.form.values[zoneId] = Number(value);
      this.recalculateSummary();
    }
  }

  selectValue(event: any): void {
    if (event.target && event.target.select) {
      event.target.select();
    }
  }

  get zones(): ZoneViewModel[] {
    if (!this.selectedResource) {
      return [];
    }

    return this.selectedResource.zones.map((zone) => ({
      zone,
      current: this.form.values[zone.id] ?? 0,
      previous: this.previousValues[zone.id],
      consumption: this.consumption.get(zone.id) ?? 0,
    }));
  }

  get isSubmitDisabled(): boolean {
    return !this.form.objectName.trim() || !this.selectedResource;
  }

  zoneName(zoneId?: string): string {
    if (!this.selectedResource) {
      return 'Общий тариф';
    }

    if (!zoneId) {
      return this.selectedResource.zones.length > 1 ? 'Общий тариф' : this.selectedResource.zones[0]?.name ?? 'Общий тариф';
    }

    return this.selectedResource.zones.find((zone) => zone.id === zoneId)?.name ?? zoneId;
  }

  formatCurrency(amount: number, currency?: string, fractionDigits = 2): string {
    return this.currencyService.format(amount, currency ?? this.defaultCurrencyCode(), fractionDigits);
  }

  private updateObjectBinding(name: string): void {
    this.form.objectName = name;
    const existing = this.store.getObjectByName(name);
    this.form.objectId = existing?.id;
    this.objects = this.store.objects();
    this.objectOptions = this.store.objectOptions();
  }

  private createDefaultForm(): MeterForm {
    const defaultObjectId = this.store.getDefaultObjectId();
    const defaultObject = defaultObjectId ? this.store.getObjectById(defaultObjectId) : undefined;
    const resources = defaultObjectId
      ? this.store.getResourcesForObject(defaultObjectId).filter((resource) => resource.type !== 'service')
      : [];
    const defaultResource = resources[0];
    return {
      objectName: defaultObject?.name ?? '',
      objectId: defaultObject?.id,
      resourceId: defaultResource?.id,
      submittedAt: new Date().toISOString().substring(0, 10),
      values: defaultResource
        ? defaultResource.zones.reduce<Record<string, number>>((acc, zone) => {
          acc[zone.id] = 0;
          return acc;
        }, {})
        : {},
    };
  }

  private patchFromExisting(id: string): void {
    const reading = this.store.getReadingById(id);
    if (!reading) {
      return;
    }

    const object = this.store.getObjectById(reading.objectId);
    const resource = this.store.getResourceById(reading.resourceId);

    this.form = {
      id: reading.id,
      objectName: object?.name ?? '',
      objectId: reading.objectId,
      resourceId: reading.resourceId,
      submittedAt: reading.submittedAt,
      values: reading.values.reduce<Record<string, number>>((acc, value) => {
        acc[value.zoneId] = value.value;
        return acc;
      }, {}),
    };

    this.resources = reading.objectId ? this.store.getResourcesForObject(reading.objectId) : [];
    this.selectedResource = resource;
    this.ensureZoneValues();
    this.refreshTariffs();
    this.recalculateSummary();
  }

  private ensureZoneValues(): void {
    if (!this.selectedResource) {
      this.form.values = {};
      return;
    }

    const updated: Record<string, number> = {};
    for (const zone of this.selectedResource.zones) {
      updated[zone.id] = this.form.values[zone.id] ?? 0;
    }

    this.form.values = updated;
  }

  private syncResources(): void {
    if (!this.form.objectId) {
      this.resources = [];
      this.selectedResource = undefined;
      this.form.resourceId = undefined;
      this.activeTariffs = [];
      this.tariffHistory = [];
      return;
    }

    this.resources = this.store
      .getResourcesForObject(this.form.objectId)
      .filter((resource) => resource.type !== 'service');
    if (!this.resources.length) {
      this.selectedResource = undefined;
      this.form.resourceId = undefined;
      this.form.values = {};
      this.activeTariffs = [];
      this.tariffHistory = [];
      return;
    }

    if (!this.form.resourceId || !this.resources.some((resource) => resource.id === this.form.resourceId)) {
      this.form.resourceId = this.resources[0].id;
    }

    this.selectedResource = this.store.getResourceById(this.form.resourceId ?? '');
    this.ensureZoneValues();
    this.refreshTariffs();
  }

  private refreshTariffs(): void {
    if (!this.selectedResource || !this.form.submittedAt) {
      this.activeTariffs = [];
      this.tariffHistory = [];
      return;
    }

    this.activeTariffs = this.store.getActiveTariffs(this.selectedResource.id, this.form.submittedAt);
    this.tariffHistory = this.store.getTariffHistory(this.selectedResource.id);
  }

  private recalculateSummary(): void {
    if (!this.selectedResource || !this.form.resourceId) {
      this.consumption = new Map();
      this.previousValues = {};
      this.estimatedCost = undefined;
      this.estimatedCurrency = undefined;
      this.previousReadingDate = undefined;
      return;
    }

    const values = this.selectedResource.zones.map<MeterReadingValue>((zone) => ({
      zoneId: zone.id,
      value: Number(this.form.values[zone.id] ?? 0),
    }));

    const summary = this.store.estimatePeriodSummary(
      this.selectedResource.id,
      values,
      this.form.submittedAt,
      this.form.id
    );

    this.consumption = summary.consumption;
    this.previousValues = summary.previous
      ? summary.previous.values.reduce<Record<string, number>>((acc, current) => {
        acc[current.zoneId] = current.value;
        return acc;
      }, {})
      : {};
    this.estimatedCost = summary.cost;
    this.estimatedCurrency = summary.currency;
    this.previousReadingDate = summary.previous?.submittedAt;
  }
}
