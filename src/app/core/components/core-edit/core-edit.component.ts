import { Component } from '@angular/core';

@Component({
  selector: 'app-core-edit',
  templateUrl: './core-edit.component.html',
  styleUrls: ['./core-edit.component.scss'],
})
export class CoreEditComponent {
  readonly utilities = [
    { name: 'DateTimeAdapter', description: 'Утилита нормализации форматов дат.' },
    { name: 'CurrencyFormatter', description: 'Вспомогательные функции для работы с валютами и округлением.' },
    { name: 'StorageKeys', description: 'Единый enum ключей локального хранилища.' },
  ];
}
