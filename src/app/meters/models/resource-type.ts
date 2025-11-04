export type ResourceType = 'water' | 'gas' | 'electricity' | 'heat' | 'service';

export interface ResourceTypeOption {
  type: ResourceType;
  label: string;
  unit: string;
  icon: string;
  description: string;
}
