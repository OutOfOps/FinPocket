import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ThemeService } from './core/services/theme.service';
import { trigger, transition, style, query, animate, group } from '@angular/animations';
import { MatSidenav } from '@angular/material/sidenav';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { APP_VERSION } from './core/tokens/app-version.token';
import { GoogleAuthService } from './services/google-auth.service';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { TemplateRef } from '@angular/core';

type NavigationItem = {
  label: string;
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
          style({ opacity: 0, transform: 'translateY(10px)' })
        ], { optional: true }),
        group([
          query(':leave', [
            animate('200ms ease-out', style({ opacity: 0, transform: 'translateY(-10px)' }))
          ], { optional: true }),
          query(':enter', [
            animate('250ms 50ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ], { optional: true })
        ])
      ])
    ])
  ]
})
export class App implements OnInit {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly themeService = inject(ThemeService);
  private readonly pwaUpdateService = inject(PwaUpdateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly googleAuth = inject(GoogleAuthService);
  protected readonly bottomSheet = inject(MatBottomSheet);
  private tokenCheckTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly activeTheme = this.themeService.theme;

  protected readonly isHandset = toSignal(
    this.breakpointObserver
      .observe(['(max-width: 959px)'])
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  protected readonly title = 'FinPocket';
  protected readonly appVersion = inject(APP_VERSION);
  protected readonly appStatus = 'Offline-first PWA';

  protected readonly navItems: NavigationItem[] = [
    {
      label: 'Финансы',
      route: '/finance',
      icon: 'account_balance_wallet',
    },
    {
      label: 'Кредиты/Депозиты',
      route: '/debts',
      icon: 'handshake',
    },
    {
      label: 'Показания',
      route: '/meters',
      icon: 'speed',
    },
    {
      label: 'Статистика',
      route: '/stats',
      icon: 'insights',
    },
    {
      label: 'Синхронизация',
      route: '/sync',
      icon: 'cloud_sync',
    },
    {
      label: 'Настройки',
      route: '/settings',
      icon: 'tune',
    },
  ];

  protected readonly hasNavigationOverlay = computed(() => this.isHandset());

  ngOnInit(): void {
    // Subscribe to version updates
    this.pwaUpdateService.versionUpdates
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          const snackBarRef = this.snackBar.open(
            'Доступна новая версия приложения!',
            'Обновить',
            {
              duration: 0, // Don't auto-dismiss
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
            }
          );

          snackBarRef
            .onAction()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.pwaUpdateService
                .activateUpdate()
                .then(() => {
                  window.location.reload();
                })
                .catch((err) => {
                  console.error('Failed to activate update:', err);
                  this.snackBar.open(
                    'Не удалось обновить приложение. Попробуйте позже.',
                    'OK',
                    { duration: 5000 }
                  );
                });
            });
        }
      });

    this.destroyRef.onDestroy(() => {
      if (this.tokenCheckTimer !== null) {
        clearTimeout(this.tokenCheckTimer);
      }
    });

    void this.ensureGoogleDriveToken();
  }

  async checkUpdate(): Promise<void> {
    const sb = this.snackBar.open('Проверка обновлений...', '', { duration: 2000 });
    try {
      const hasUpdate = await this.pwaUpdateService.checkForUpdate();
      sb.dismiss();
      if (hasUpdate) {
        const ref = this.snackBar.open('Доступна новая версия!', 'Обновить', { duration: 10000 });
        ref.onAction().subscribe(() => {
          this.pwaUpdateService.activateUpdate().then(() => window.location.reload());
        });
      } else {
        this.snackBar.open('У вас установлена последняя версия', 'ОК', { duration: 3000 });
      }
    } catch (err) {
      sb.dismiss();
      console.error('Update check failed', err);
      // Don't show error to user if it's just offline or configured out
    }
  }

  protected async onNavItemSelect(drawer: MatSidenav): Promise<void> {
    if (!this.isHandset()) {
      return;
    }

    await drawer.close();
  }

  protected openQuickActions(tpl: TemplateRef<any>): void {
    this.bottomSheet.open(tpl);
  }

  private async ensureGoogleDriveToken(): Promise<void> {
    try {
      const token = await this.googleAuth.ensureTokenValid();
      if (token) {
        console.log('🔄 Google Drive токен активен');
      }
    } catch (error) {
      console.error('Не удалось проверить токен Google Drive', error);
    } finally {
      this.tokenCheckTimer = setTimeout(() => {
        void this.ensureGoogleDriveToken();
      }, 5 * 60 * 1000);
    }
  }
}
