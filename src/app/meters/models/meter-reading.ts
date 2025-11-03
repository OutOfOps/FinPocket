export type MeterType = 'water' | 'gas' | 'electricity';

export interface MeterReading {
  id: string;
  object: string;
  type: MeterType;
  value: number;
  unit: string;
  submittedAt: string;
}

export interface MeterTypeOption {
  type: MeterType;
  label: string;
  unit: string;
}
