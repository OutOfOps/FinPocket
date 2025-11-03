import { Component } from '@angular/core';

interface SyncProviderOption {
  id: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-sync-edit',
  templateUrl: './sync-edit.component.html',
  styleUrls: ['./sync-edit.component.scss'],
})
export class SyncEditComponent {
  readonly providers: SyncProviderOption[] = [
    { id: 'gdrive', title: 'Google Drive', description: '15 ГБ бесплатно, OAuth авторизация' },
    { id: 'dropbox', title: 'Dropbox', description: 'Гибкая структура папок и ревизии' },
    { id: 'icloud', title: 'iCloud', description: 'Интеграция с экосистемой Apple' },
  ];

  selectedProvider = this.providers[0].id;
  encryptionEnabled = true;

  save(): void {
    console.info('Настройка синхронизации', {
      provider: this.selectedProvider,
      encryptionEnabled: this.encryptionEnabled,
    });
  }
}
