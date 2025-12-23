import { ResourceType } from './resource-type';

export type ResourcePricingModel = 'per_unit' | 'fixed';

export interface MeterObject {
  id: string;
  name: string;
  address?: string;
}

export interface ResourceZone {
  id: string;
  name: string;
}

export interface ResourceEntity {
  id: string;
  objectId: string;
  type: ResourceType;
  name: string;
  unit: string;
  pricingModel: ResourcePricingModel;
  zones: ResourceZone[];
  initialValues?: { zoneId: string; value: number }[];
  fixedAmount?: number;
  fixedCurrency?: string;
}

export interface TariffHistoryEntry {
  id: string;
  resourceId: string;
  zoneId?: string;
  price: number;
  currency: string;
  effectiveFrom: string;
  description?: string;
}

export interface ResourceSummary {
  resource: ResourceEntity;
  object: MeterObject;
  currentTariffs: TariffHistoryEntry[];
}
