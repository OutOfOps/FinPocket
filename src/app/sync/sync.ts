import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal, computed } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { NgForm } from '@angular/forms';
import { liveQuery } from 'dexie';
import type { Subscription as DexieSubscription } from 'dexie';

import { SharedModule } from '../shared/shared-module';
import { formatBytes } from '../shared/utils/format-bytes';
import { SyncService } from './sync.service';
import { SyncSettingsService } from './services/sync-settings.service';
import { SyncProviderRegistryService } from './services/sync-provider-registry.service';
import { AuthState, CloudProvider } from './cloud-provider';
import { FinPocketDB, BackupEntity } from '../core/services/finpocket-db.service';
import { MetersStore } from '../meters/services/meters-store.service';
import { TransactionsStore } from '../finance/services/transactions.store';
import { SubscriptionsStore } from '../finance/services/subscriptions.store';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { GDRIVE_CLIENT_ID_PATTERN } from './gdrive.provider';

type ProviderStatus = 'offline' | 'connected' | 'syncing' | 'error';
type ProviderId = CloudProvider['id'];
type SyncAction = 'upload' | 'download' | 'restore' | 'delete';

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

interface BackupHistoryEntry {
  id?: number;
  createdAt: string;
  sizeLabel: string;
  checksum: string;
}

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sync.html',
  styleUrls: ['./sync.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sync implements OnDestroy {
  // Services
  protected readonly syncService = inject(SyncService);
  protected readonly settings = inject(SyncSettingsService);
  private readonly registry = inject(SyncProviderRegistryService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly db = inject(FinPocketDB);
  private readonly metersStore = inject(MetersStore);
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly subscriptionsStore = inject(SubscriptionsStore);

  // State Signals
  readonly isLoading = signal(false);
  readonly providers = signal<ProviderState[]>([]);
  readonly localBackups = signal<BackupHistoryEntry[]>([]);

  // Settings Signals
  encryptionEnabled = this.settings.getEncryptionEnabled();
  gdriveClientId = this.settings.getGoogleDriveClientId() ?? '';
  readonly gdriveClientIdPattern = GDRIVE_CLIENT_ID_PATTERN;
  readonly gdriveClientIdPatternSource = GDRIVE_CLIENT_ID_PATTERN.source.replace(/^\^|\$$/g, '');

  // Subscriptions
  private dexieSub?: DexieSubscription;

  // Computed Values
  readonly activeProvider = computed(() => this.providers()[0]);
  readonly isConnected = computed(() => this.activeProvider()?.connected ?? false);
  readonly isSyncing = computed(() => this.activeProvider()?.status === 'syncing');

  constructor() {
    this.initLocalHistory();
    void this.reloadCloudProviders();
  }

  ngOnDestroy(): void {
    this.dexieSub?.unsubscribe();
  }

  // --- Initialization ---

  private initLocalHistory(): void {
    this.dexieSub = liveQuery(() => this.db.backups.orderBy('createdAt').reverse().limit(10).toArray())
      .subscribe({
        next: (items) => {
          this.localBackups.set(items.map(item => ({
            id: item.id,
            createdAt: item.createdAt,
            sizeLabel: formatBytes(item.size),
            checksum: item.checksum
          })));
        }
      });
  }

  async reloadCloudProviders(): Promise<void> {
    this.isLoading.set(true);
    try {
      const providers = this.registry.listProviders();
      const states = await Promise.all(providers.map(p => this.buildProviderState(p)));
      this.providers.set(states);
    } catch (error) {
      console.error('[Sync] Load providers failed', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // --- Cloud Actions ---

  async toggleAuth(): Promise<void> {
    const state = this.activeProvider();
    if (!state) {
      this.showMessage('Провайдер не настроен. Укажите Client ID.');
      return;
    }

    if (state.connected) {
      await this.disconnect(state);
    } else {
      await this.connect(state);
    }
  }

  async connect(state: ProviderState): Promise<void> {
    const provider = this.registry.getProvider(state.id);
    if (!provider) return;

    this.markStatus(state.id, 'syncing');
    try {
      await provider.login();
      this.showMessage('Авторизация выполнена.');
      await this.refreshProvider(state.id, provider);
    } catch (error) {
      this.handleError(state.id, 'Вход не выполнен', error);
    }
  }

  async disconnect(state: ProviderState): Promise<void> {
    const provider = this.registry.getProvider(state.id);
    if (!provider) return;

    this.markStatus(state.id, 'syncing');
    try {
      await provider.logout();
      this.showMessage('Вы вышли из аккаунта.');
    } catch (error) {
      this.handleError(state.id, 'Выход не удался', error);
    } finally {
      await this.refreshProvider(state.id, provider);
    }
  }

  async syncNow(): Promise<void> {
    const state = this.activeProvider();
    if (!state || !state.connected) return;

    await this.performSync(state, 'upload', async (provider, passphrase) => {
      await this.syncService.twoWaySync(provider, passphrase, 'two-way');
      // GLOBAL REFRESH
      await this.metersStore.refresh();
      await this.transactionsStore.refresh();
      await this.subscriptionsStore.refresh();
    });
  }

  async restoreLast(): Promise<void> {
    const state = this.activeProvider();
    if (!state || !state.connected || !state.backups.length) return;

    await this.performSync(state, 'restore', async (provider, passphrase) => {
      const latest = state.backups[0];
      const blob = await provider.downloadBackup(latest.id);
      await this.syncService.importBackup(blob, passphrase);
      // GLOBAL REFRESH
      await this.metersStore.refresh();
      await this.transactionsStore.refresh();
      await this.subscriptionsStore.refresh();
    });
  }

  async restoreSpecific(backup: ProviderBackupEntry): Promise<void> {
    const state = this.activeProvider();
    if (!state) return;

    await this.performSync(state, 'restore', async (provider, passphrase) => {
      const blob = await provider.downloadBackup(backup.id);
      await this.syncService.importBackup(blob, passphrase);
      // GLOBAL REFRESH
      await this.metersStore.refresh();
      await this.transactionsStore.refresh();
      await this.subscriptionsStore.refresh();
    });
  }

  // --- Settings Actions ---

  saveSettings(form: NgForm): void {
    if (form.invalid) {
      this.showMessage('Исправьте ошибки в настройках.', true);
      return;
    }

    const trimmedId = this.gdriveClientId.trim();
    this.settings.setGoogleDriveClientId(trimmedId.length ? trimmedId : null);
    this.settings.setEncryptionEnabled(this.encryptionEnabled);
    this.registry.invalidate('gdrive');

    void this.reloadCloudProviders();
    this.showMessage('Настройки сохранены.');
  }

  // --- Helpers ---

  private async performSync(
    state: ProviderState,
    action: SyncAction,
    handler: (provider: CloudProvider, passphrase: string) => Promise<void>
  ): Promise<void> {
    const provider = this.registry.getProvider(state.id);
    if (!provider) return;

    const previousStatus = state.status;
    this.markStatus(state.id, 'syncing');

    const passphrase = this.requestPassphrase(action);
    if (!passphrase) {
      this.markStatus(state.id, previousStatus);
      return;
    }

    try {
      await handler(provider, passphrase);
      this.showMessage('Синхронизация завершена успешно.');
    } catch (error) {
      this.handleError(state.id, 'Ошибка синхронизации', error);
    } finally {
      await this.refreshProvider(state.id, provider, true);
    }
  }

  private async refreshProvider(id: ProviderId, provider: CloudProvider, markSynced = false): Promise<void> {
    const newState = await this.buildProviderState(provider);
    if (markSynced) newState.lastSync = new Date().toISOString();
    this.providers.update(curr => curr.map(p => p.id === id ? newState : p));
  }

  private async buildProviderState(provider: CloudProvider): Promise<ProviderState> {
    const connected = await provider.isAuthenticated();
    const auth = connected ? await provider.getAuthState() : null;
    let backups: ProviderBackupEntry[] = [];

    if (connected) {
      try {
        const remote = await provider.listBackups();
        backups = remote.sort((a, b) => b.modified - a.modified).map(b => ({
          id: b.id,
          name: b.name,
          modified: new Date(b.modified).toISOString(),
          sizeBytes: b.size,
          sizeLabel: formatBytes(b.size)
        }));
      } catch { }
    }

    return {
      id: provider.id,
      title: provider.label,
      description: 'Облачное хранилище для ваших данных',
      connected,
      status: connected ? 'connected' : 'offline',
      lastSync: backups[0]?.modified,
      recentErrors: [],
      backups,
      user: auth?.user
    };
  }

  private markStatus(id: ProviderId, status: ProviderStatus): void {
    this.providers.update(items => items.map(p => p.id === id ? { ...p, status } : p));
  }

  private handleError(id: ProviderId, context: string, error: any): void {
    const message = error?.message || 'Неизвестная ошибка';
    this.showMessage(`${context}: ${message}`, true);
    this.markStatus(id, 'error');
  }

  private requestPassphrase(action: string): string | null {
    const input = window.prompt(`Введите мастер-пароль для ${action}`);
    return input?.trim() || null;
  }

  private showMessage(msg: string, isError = false): void {
    this.snackBar.open(msg, 'Закрыть', { duration: 4000 });
  }

  statusLabel(status: ProviderStatus): string {
    const labels: any = { offline: 'Не подключен', connected: 'Подключен', syncing: 'Синхронизация...', error: 'Ошибка' };
    return labels[status] || status;
  }
}
