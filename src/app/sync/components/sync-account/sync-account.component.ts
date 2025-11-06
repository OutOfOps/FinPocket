import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedModule } from '../../../shared/shared-module';
import { formatBytes } from '../../../shared/utils/format-bytes';
import { SyncService } from '../../sync.service';
import { SyncProviderRegistryService } from '../../services/sync-provider-registry.service';
import { AuthState, CloudProvider } from '../../cloud-provider';

const MAX_ERROR_HISTORY = 5;

type ProviderStatus = 'offline' | 'connected' | 'syncing' | 'error';

type ProviderId = CloudProvider['id'];

type SyncAction = 'upload' | 'download' | 'restore' | 'delete' | 'login' | 'logout';

interface ProviderBackupEntry {
  id: string;
  name: string;
  modified: string;
  sizeBytes: number;
  sizeLabel: string;
}

interface ProviderState {
  id: ProviderId;
  title: string;
  description: string;
  connected: boolean;
  status: ProviderStatus;
  lastSync?: string;
  recentErrors: string[];
  backups: ProviderBackupEntry[];
  user?: AuthState['user'];
}

@Component({
  selector: 'app-sync-account',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sync-account.component.html',
  styleUrls: ['./sync-account.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncAccountComponent {
  private readonly statusLabels: Record<ProviderStatus, string> = {
    offline: 'Не подключен',
    connected: 'Подключен',
    syncing: 'Синхронизация',
    error: 'Есть ошибки',
  };

  private readonly descriptions: Record<ProviderId, string> = {
    gdrive: 'Облачное хранилище Google с надёжной авторизацией через OAuth 2.0.',
    onedrive: 'OneDrive пока не поддерживается.',
    dropbox: 'Dropbox пока не поддерживается.',
  };

  readonly providers = signal<ProviderState[]>([]);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);

  private readonly registry = inject(SyncProviderRegistryService);
  private readonly syncService = inject(SyncService);
  private readonly snackBar = inject(MatSnackBar);

  constructor() {
    void this.reloadProviders();
  }

  async reloadProviders(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);

    try {
      const providers = this.registry.listProviders();
      if (!providers.length) {
        this.providers.set([]);
        return;
      }

      const states = await Promise.all(providers.map((provider) => this.buildProviderState(provider)));
      this.providers.set(states.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (error) {
      this.loadError.set(this.describeError(error));
    } finally {
      this.isLoading.set(false);
    }
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

  async connect(state: ProviderState): Promise<void> {
    if (state.connected) {
      return;
    }

    const provider = this.registry.getProvider(state.id);
    if (!provider) {
      this.pushError(state.id, 'Провайдер не настроен, укажите Client ID в настройках.');
      return;
    }

    this.markStatus(state.id, 'syncing');

    try {
      await provider.login();
      this.showMessage('Авторизация выполнена.');
      await this.refreshProvider(state.id, provider);
    } catch (error) {
      const message = this.describeError(error);
      this.pushError(state.id, `Вход не выполнен: ${message}`);
      this.showMessage(message, true);
      this.markStatus(state.id, 'error');
    }
  }

  async disconnect(state: ProviderState): Promise<void> {
    if (!state.connected) {
      return;
    }

    const provider = this.registry.getProvider(state.id);
    if (!provider) {
      return;
    }

    this.markStatus(state.id, 'syncing');

    try {
      await provider.logout();
      this.showMessage('Вы вышли из аккаунта.');
    } catch (error) {
      const message = this.describeError(error);
      this.pushError(state.id, `Не удалось выйти: ${message}`);
      this.showMessage(message, true);
    } finally {
      await this.refreshProvider(state.id, provider);
    }
  }

  async triggerUpload(state: ProviderState): Promise<void> {
    await this.performSync(state, 'upload', async (provider, passphrase) => {
      await this.syncService.twoWaySync(provider, passphrase, 'upload');
    });
  }

  async triggerDownload(state: ProviderState): Promise<void> {
    if (!state.backups.length) {
      this.showMessage('Нет резервных копий для загрузки.');
      return;
    }

    await this.performSync(state, 'download', async (provider, passphrase) => {
      await this.syncService.twoWaySync(provider, passphrase, 'download');
    });
  }

  async restoreBackup(state: ProviderState, backup: ProviderBackupEntry): Promise<void> {
    await this.performSync(state, 'restore', async (provider, passphrase) => {
      const blob = await provider.downloadBackup(backup.id);
      await this.syncService.importBackup(blob, passphrase);
    });
  }

  async deleteBackup(state: ProviderState, backup: ProviderBackupEntry): Promise<void> {
    const provider = this.registry.getProvider(state.id);
    if (!provider) {
      this.pushError(state.id, 'Провайдер не настроен.');
      return;
    }

    this.markStatus(state.id, 'syncing');

    try {
      await provider.deleteBackup(backup.id);
      this.showMessage(`Резервная копия ${backup.name} удалена.`);
    } catch (error) {
      const message = this.describeError(error);
      this.pushError(state.id, `Не удалось удалить копию: ${message}`);
      this.showMessage(message, true);
    } finally {
      await this.refreshProvider(state.id, provider);
    }
  }

  private async performSync(
    state: ProviderState,
    action: SyncAction,
    handler: (provider: CloudProvider, passphrase: string) => Promise<void>
  ): Promise<void> {
    if (!state.connected) {
      this.showMessage('Сначала выполните вход в аккаунт.');
      return;
    }

    const provider = this.registry.getProvider(state.id);
    if (!provider) {
      this.pushError(state.id, 'Провайдер не настроен.');
      return;
    }

    const previousStatus = state.status;
    this.markStatus(state.id, 'syncing');

    const passphrase = this.requestPassphrase(action);
    if (!passphrase) {
      this.markStatus(state.id, previousStatus);
      this.showMessage('Действие отменено.');
      return;
    }

    try {
      await handler(provider, passphrase);
      this.showMessage('Синхронизация завершена.');
    } catch (error) {
      const message = this.describeError(error);
      this.pushError(state.id, `Ошибка операции: ${message}`);
      this.showMessage(message, true);
      this.markStatus(state.id, 'error');
      return;
    }

    await this.refreshProvider(state.id, provider, true);
  }

  private async refreshProvider(
    providerId: ProviderId,
    provider: CloudProvider,
    markSynced = false
  ): Promise<void> {
    try {
      const state = await this.buildProviderState(provider);
      if (markSynced) {
        state.lastSync = new Date().toISOString();
      }

      this.providers.update((current) => {
        const filtered = current.filter((item) => item.id !== providerId);
        return [...filtered, state].sort((a, b) => a.title.localeCompare(b.title));
      });
    } catch (error) {
      const message = this.describeError(error);
      this.pushError(providerId, `Не удалось обновить состояние: ${message}`);
      this.markStatus(providerId, 'error');
    }
  }

  private async buildProviderState(provider: CloudProvider): Promise<ProviderState> {
    let connected = false;
    let auth: AuthState | null = null;
    const errors: string[] = [];

    try {
      connected = await provider.isAuthenticated();
      auth = connected ? await provider.getAuthState() : null;
    } catch (error) {
      errors.push(`Проверка статуса: ${this.describeError(error)}`);
    }

    let backups: ProviderBackupEntry[] = [];
    if (connected) {
      try {
        const remoteBackups = await provider.listBackups();
        backups = remoteBackups
          .sort((a, b) => b.modified - a.modified)
          .map((backup) => ({
            id: backup.id,
            name: backup.name,
            modified: new Date(backup.modified).toISOString(),
            sizeBytes: backup.size,
            sizeLabel: formatBytes(backup.size),
          }));
      } catch (error) {
        errors.push(`Список резервных копий: ${this.describeError(error)}`);
      }
    }

    return {
      id: provider.id,
      title: provider.label,
      description: this.descriptions[provider.id] ?? provider.label,
      connected,
      status: errors.length ? 'error' : connected ? 'connected' : 'offline',
      lastSync: connected && backups.length ? backups[0].modified : undefined,
      recentErrors: errors.slice(0, MAX_ERROR_HISTORY),
      backups,
      user: auth?.user,
    };
  }

  private markStatus(providerId: ProviderId, status: ProviderStatus): void {
    this.providers.update((items) =>
      items.map((item) => (item.id === providerId ? { ...item, status } : item))
    );
  }

  private pushError(providerId: ProviderId, message: string): void {
    const timestamp = new Date().toISOString();
    this.providers.update((items) =>
      items.map((item) =>
        item.id === providerId
          ? {
              ...item,
              status: 'error',
              recentErrors: [`${timestamp} — ${message}`, ...item.recentErrors].slice(
                0,
                MAX_ERROR_HISTORY
              ),
            }
          : item
      )
    );
  }

  private requestPassphrase(action: SyncAction): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const descriptionMap: Record<SyncAction, string> = {
      upload: 'выгрузки данных',
      download: 'загрузки данных',
      restore: 'восстановления из копии',
      delete: 'удаления копии',
      login: 'авторизации',
      logout: 'выхода из аккаунта',
    };

    const promptMessage = `Введите мастер-пароль для ${descriptionMap[action] ?? 'операции'}`;
    const input = window.prompt(promptMessage);
    return input && input.trim().length > 0 ? input.trim() : null;
  }

  private showMessage(message: string, isError = false): void {
    this.snackBar.open(message, 'OK', {
      duration: 4000,
      panelClass: isError ? ['sync-account__snackbar-error'] : undefined,
    });
  }

  private describeError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Неизвестная ошибка';
    }
  }
}
