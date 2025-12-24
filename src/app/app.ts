import { Component, inject, OnInit, DestroyRef, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeService } from './core/services/theme.service';
import { trigger, transition, style, query, animate, group } from '@angular/animations';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { APP_VERSION } from './core/tokens/app-version.token';
import { GoogleAuthService } from './services/google-auth.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { TemplateRef, signal, computed } from '@angular/core';
import { SyncQueue } from './sync/sync.queue';
import { SyncService } from './sync/sync.service';
import { SyncSettingsService } from './sync/services/sync-settings.service';
import { SyncProviderRegistryService } from './sync/services/sync-provider-registry.service';

type NavigationItem = {
  route: string;
  icon: string;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        query(':enter, :leave', [
          style({
            gridColumn: 1,
            gridRow: 1
          })
        ], { optional: true }),
        query(':enter', [
          style({ opacity: 0, transform: 'scale(0.98)' })
        ], { optional: true }),
        group([
          query(':leave', [
            animate('150ms ease-out', style({ opacity: 0 }))
          ], { optional: true }),
          query(':enter', [
            animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
          ], { optional: true })
        ])
      ])
    ])
  ]
})
export class App implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly pwaUpdateService = inject(PwaUpdateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly googleAuth = inject(GoogleAuthService);
  protected readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);
  private readonly syncQueue = inject(SyncQueue);
  private readonly syncService = inject(SyncService);
  private readonly syncSettings = inject(SyncSettingsService);
  private readonly registry = inject(SyncProviderRegistryService);

  // Sync state
  protected readonly isSyncing = signal(false);
  protected readonly hasPendingChanges = signal(false);
  private tokenCheckTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly appVersion = inject(APP_VERSION);
  protected readonly appStatus = 'FinPocket';

  private deferredPrompt: any;
  protected showInstallBtn = false;

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: Event): void {
    e.preventDefault();
    this.deferredPrompt = e;
    this.showInstallBtn = true;
  }

  protected readonly navItems: NavigationItem[] = [
    {
      route: '/finance',
      icon: 'account_balance_wallet',
    },
    {
      route: '/debts',
      icon: 'handshake',
    },
    {
      route: '/meters',
      icon: 'bolt',
    },
    {
      route: '/stats',
      icon: 'bar_chart',
    },
  ];

  ngOnInit(): void {
    if (this.pwaUpdateService.versionUpdates) {
      this.pwaUpdateService.versionUpdates
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (event.type === 'VERSION_READY') {
            const sb = this.snackBar.open(
              'Доступна новая версия приложения',
              'Обновить',
              { duration: 10000 }
            );
            sb.onAction().subscribe(() => {
              this.pwaUpdateService
                .activateUpdate()
                .then(() => {
                  window.location.reload();
                })
                .catch((err) => {
                  console.error('Failed to activate update:', err);
                });
            });
          }
        });
    }

    this.destroyRef.onDestroy(() => {
      if (this.tokenCheckTimer !== null) {
        clearTimeout(this.tokenCheckTimer);
      }
    });

    void this.ensureGoogleDriveToken();
    void this.monitorSyncQueue();
    void this.setupAutoSync();
  }

  private async monitorSyncQueue(): Promise<void> {
    // Basic polling for queue status to update the dot
    const check = async () => {
      const pending = await this.syncQueue.getPending();
      this.hasPendingChanges.set(pending.length > 0);
    };

    await check();
    setInterval(check, 5000);
  }

  protected async triggerSync(): Promise<void> {
    if (this.isSyncing()) return;

    const providerId = 'gdrive'; // Default
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      this.snackBar.open('Настройте Google Drive в настройках', 'ОК', { duration: 3000 });
      return;
    }

    const passphrase = this.syncSettings.getMasterPassword();
    if (!passphrase) {
      this.snackBar.open('Введите мастер-пароль в настройках', 'ОК', { duration: 3000 });
      return;
    }

    this.isSyncing.set(true);
    try {
      await this.syncService.twoWaySync(provider, passphrase, 'two-way');
      this.snackBar.open('Синхронизация выполнена', undefined, { duration: 2000 });
      this.hasPendingChanges.set(false);
    } catch (error: any) {
      console.error('[App] Sync failed', error);
      this.snackBar.open(`Ошибка: ${error.message || 'неизвестно'}`, 'ОК', { duration: 5000 });
    } finally {
      this.isSyncing.set(false);
    }
  }

  private setupAutoSync(): void {
    const run = async () => {
      if (!this.syncSettings.getAutoSyncEnabled() || this.isSyncing()) return;

      const interval = this.syncSettings.getSyncInterval();
      if (interval <= 0) return;

      console.log(`[AutoSync] Running periodic check...`);
      await this.triggerSync();
    };

    const intervalMin = this.syncSettings.getSyncInterval();
    if (intervalMin > 0) {
      setInterval(() => run(), intervalMin * 60 * 1000);
    }
  }


  async checkUpdate(): Promise<void> {
    const sb = this.snackBar.open('Проверка...', '', { duration: 1000 });
    try {
      const hasUpdate = await this.pwaUpdateService.checkForUpdate();
      // sb.dismiss();
      if (hasUpdate) {
        const ref = this.snackBar.open('Новая версия!', 'Обновиться', { duration: 10000 });
        ref.onAction().subscribe(() => {
          this.pwaUpdateService.activateUpdate().then(() => window.location.reload());
        });
      }
    } catch (err) {
      // ignore
    }
  }

  protected openQuickActions(tpl: TemplateRef<any>): void {
    this.bottomSheet.open(tpl, { panelClass: 'quick-actions-sheet-container' });
  }

  protected openCurrencyRates(): void {
    import('./shared/components/currency-rates-dialog/currency-rates-dialog.component')
      .then(m => {
        this.dialog.open(m.CurrencyRatesDialogComponent, {
          width: '500px',
          maxWidth: '95vw',
          panelClass: 'currency-dialog-panel'
        });
      });
  }

  protected async installApp(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.showInstallBtn = false;
    }
    this.deferredPrompt = null;
  }

  private async ensureGoogleDriveToken(): Promise<void> {
    try {
      const token = await this.googleAuth.ensureTokenValid();
      if (token) {
        console.log('🔄 Google Drive токен активен');
      }
    } catch (error) {
      // Silent fail
    } finally {
      this.tokenCheckTimer = setTimeout(() => {
        void this.ensureGoogleDriveToken();
      }, 5 * 60 * 1000);
    }
  }
}
