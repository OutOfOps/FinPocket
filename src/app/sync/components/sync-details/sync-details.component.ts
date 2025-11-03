import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

@Component({
  selector: 'app-sync-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sync-details.component.html',
  styleUrls: ['./sync-details.component.scss'],
})
export class SyncDetailsComponent {
  readonly lastRestore = {
    requestedAt: '2024-02-27T12:45:00Z',
    duration: '2 мин 14 сек',
    status: 'Успешно восстановлено на устройство iPhone',
  };

  readonly integrityChecks = [
    { label: 'Контроль хешей', result: 'Совпадение' },
    { label: 'Проверка структуры БД', result: 'Без ошибок' },
    { label: 'Синхронизация вложений', result: '3 файла обновлено' },
  ];
}
