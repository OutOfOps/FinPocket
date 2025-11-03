import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

interface MeterForm {
  object: string;
  type: 'water' | 'gas' | 'electricity';
  value: number;
  unit: string;
  submittedAt: string;
}

@Component({
  selector: 'app-meters-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-edit.component.html',
  styleUrls: ['./meters-edit.component.scss'],
})
export class MetersEditComponent {
  readonly form: MeterForm = {
    object: 'Квартира, ул. Ленина 10',
    type: 'water',
    value: 0,
    unit: 'м³',
    submittedAt: new Date().toISOString().substring(0, 10),
  };

  readonly objectOptions = ['Квартира, ул. Ленина 10', 'Дом, СНТ Берёзка'];

  readonly typeOptions: { type: MeterForm['type']; label: string; unit: string }[] = [
    { type: 'water', label: 'Вода', unit: 'м³' },
    { type: 'gas', label: 'Газ', unit: 'м³' },
    { type: 'electricity', label: 'Электричество', unit: 'кВт·ч' },
  ];

  updateType(type: MeterForm['type']): void {
    const config = this.typeOptions.find((option) => option.type === type);
    if (!config) {
      return;
    }

    this.form.type = config.type;
    this.form.unit = config.unit;
  }

  submit(): void {
    console.info('Сохранение показаний', this.form);
  }
}
