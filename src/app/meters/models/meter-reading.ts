export type MeterType = 'water' | 'gas' | 'electricity' | 'heat';

export interface MeterReadingValue {
  zoneId: string;
  value: number;
}

export interface MeterReading {
  id: string;
  objectId: string;
  resourceId: string;
  submittedAt: string;
  values: MeterReadingValue[];
}

export interface MeterTypeOption {
  type: MeterType;
  label: string;
  unit: string;
}
