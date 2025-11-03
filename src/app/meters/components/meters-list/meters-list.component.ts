import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

interface MeterReading {
  id: string;
  object: string;
  type: 'water' | 'gas' | 'electricity';
  value: number;
  unit: string;
  submittedAt: string;
}

@Component({
  selector: 'app-meters-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-list.component.html',
  styleUrls: ['./meters-list.component.scss'],
})
export class MetersListComponent {
  readonly readings: MeterReading[] = [
    { id: 'MTR-001', object: 'Квартира, ул. Ленина 10', type: 'water', value: 112.5, unit: 'м³', submittedAt: '2024-03-01' },
    { id: 'MTR-002', object: 'Квартира, ул. Ленина 10', type: 'electricity', value: 2150, unit: 'кВт·ч', submittedAt: '2024-03-01' },
    { id: 'MTR-003', object: 'Дом, СНТ Берёзка', type: 'gas', value: 342, unit: 'м³', submittedAt: '2024-03-05' },
  ];

  typeLabel(type: MeterReading['type']): string {
    switch (type) {
      case 'water':
        return 'Вода';
      case 'gas':
        return 'Газ';
      case 'electricity':
        return 'Электричество';
    }
  }
}
