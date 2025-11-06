import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

type ProviderStatus = 'offline' | 'connected' | 'syncing' | 'error';

interface ProviderBackupEntry {
  id: string;
  name: string;
  modified: string;
  size: string;
}

interface ProviderState {
  id: string;
  title: string;
  description: string;
  connected: boolean;
  status: ProviderStatus;
  lastSync?: string;
  recentErrors: string[];
  backups: ProviderBackupEntry[];
}

@Component({
  selector: 'app-sync-account',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sync-account.component.html',
  styleUrls: ['./sync-account.component.scss'],
})
export class SyncAccountComponent {
  private readonly statusLabels: Record<ProviderStatus, string> = {
    offline: 'Не подключен',
    connected: 'Подключен',
    syncing: 'Синхронизация',
    error: 'Есть ошибки',
  };

  providers: ProviderState[] = [
    {
      id: 'gdrive',
      title: 'Google Drive',
      description: 'Облачное хранилище с интеграцией Gmail и Android устройств.',
      connected: true,
      status: 'connected',
      lastSync: '2024-03-21T18:10:00Z',
      recentErrors: [
        '2024-03-18 20:05 — Превышен лимит запросов, повтор через 10 минут',
      ],
      backups: [
        { id: 'g-1', name: 'backup-2024-03-21.json', modified: '2024-03-21T18:00:00Z', size: '12.4 МБ' },
        { id: 'g-2', name: 'backup-2024-03-15.json', modified: '2024-03-15T07:30:00Z', size: '11.9 МБ' },
      ],
    },
    {
      id: 'onedrive',
      title: 'OneDrive',
      description: 'Хранилище Microsoft с поддержкой Office 365 и Windows 11.',
      connected: false,
      status: 'offline',
      lastSync: undefined,
      recentErrors: [],
      backups: [
        { id: 'o-1', name: 'finpocket-2024-02-01.json', modified: '2024-02-01T08:20:00Z', size: '10.7 МБ' },
      ],
    },
    {
      id: 'dropbox',
      title: 'Dropbox',
      description: 'Простое и стабильное решение с версионированием файлов.',
      connected: true,
      status: 'error',
      lastSync: '2024-03-10T12:42:00Z',
      recentErrors: [
        '2024-03-19 09:12 — Не удалось обновить токен доступа',
        '2024-03-11 22:30 — Разрыв соединения при выгрузке',
      ],
      backups: [
        { id: 'd-1', name: 'fin-pocket-prod.json', modified: '2024-03-10T12:30:00Z', size: '13.1 МБ' },
        { id: 'd-2', name: 'fin-pocket-archive.json', modified: '2024-02-28T16:00:00Z', size: '9.8 МБ' },
      ],
    },
  ];

  connect(provider: ProviderState): void {
    if (provider.connected) {
      return;
    }

    provider.connected = true;
    provider.status = 'connected';
    provider.lastSync = new Date().toISOString();
    provider.recentErrors = provider.recentErrors.filter((_, index) => index < 3);

    console.info('Авторизация провайдера', provider.id);
  }

  disconnect(provider: ProviderState): void {
    if (!provider.connected) {
      return;
    }

    provider.connected = false;
    provider.status = 'offline';

    console.info('Выход из провайдера', provider.id);
  }

  triggerUpload(provider: ProviderState): void {
    if (!provider.connected) {
      return;
    }

    this.markSynced(provider, 'upload');
  }

  triggerDownload(provider: ProviderState): void {
    if (!provider.connected || provider.backups.length === 0) {
      return;
    }

    this.markSynced(provider, 'download');
  }

  downloadBackup(provider: ProviderState, backup: ProviderBackupEntry): void {
    if (!provider.connected) {
      return;
    }

    this.markSynced(provider, `download:${backup.id}`);
  }

  uploadBackup(provider: ProviderState, backup: ProviderBackupEntry): void {
    if (!provider.connected) {
      return;
    }

    this.markSynced(provider, `upload:${backup.id}`);
  }

  deleteBackup(provider: ProviderState, backup: ProviderBackupEntry): void {
    if (!provider.connected) {
      return;
    }

    provider.backups = provider.backups.filter((entry) => entry.id !== backup.id);
    provider.recentErrors.unshift(
      `${new Date().toISOString()} — Резервная копия ${backup.name} удалена вручную`
    );
    provider.recentErrors = provider.recentErrors.slice(0, 3);

    console.info('Удаление резервной копии', { provider: provider.id, backup: backup.id });
  }

  statusLabel(status: ProviderStatus): string {
    return this.statusLabels[status];
  }

  statusClass(status: ProviderStatus): string {
    return `sync-account__status-dot--${status}`;
  }

  trackByProvider(_index: number, item: ProviderState): string {
    return item.id;
  }

  trackByBackup(_index: number, item: ProviderBackupEntry): string {
    return item.id;
  }

  private markSynced(provider: ProviderState, action: string): void {
    provider.status = 'syncing';

    setTimeout(() => {
      provider.status = 'connected';
      provider.lastSync = new Date().toISOString();
      provider.recentErrors = provider.recentErrors.filter((_, index) => index < 3);
      console.info('Синхронизация выполнена', { provider: provider.id, action });
    }, 300);
  }
}
