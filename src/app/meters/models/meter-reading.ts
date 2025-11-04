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
