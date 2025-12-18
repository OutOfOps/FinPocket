import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeService } from './core/services/theme.service';
import { trigger, transition, style, query, animate, group } from '@angular/animations';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { APP_VERSION } from './core/tokens/app-version.token';
import { GoogleAuthService } from './services/google-auth.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { TemplateRef } from '@angular/core';

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
  private tokenCheckTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly appVersion = inject(APP_VERSION);
  protected readonly appStatus = 'FinPocket';

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
  }

  cycleTheme(): void {
    this.themeService.cycleAccent();
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
