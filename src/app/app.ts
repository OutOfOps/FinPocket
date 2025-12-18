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
  description: string;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
          style({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%'
          })
        ], { optional: true }),
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' })
        ], { optional: true }),
        group([
          query(':leave', [
            animate('200ms ease-out', style({ opacity: 0, transform: 'translateY(-15px)' }))
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
      description: 'Транзакции, счета и бюджеты',
    },
    {
      label: 'Кредиты/Депозиты',
      route: '/debts',
      icon: 'handshake',
      description: 'Обязательства, накопления и напоминания по займам',
    },
    {
      label: 'Показания',
      route: '/meters',
      icon: 'speed',
      description: 'Учёт коммунальных счётчиков и тарифов',
    },
    {
      label: 'Статистика',
      route: '/stats',
      icon: 'insights',
      description: 'Дашборды и динамика по периодам',
    },
    {
      label: 'Синхронизация',
      route: '/sync',
      icon: 'cloud_sync',
      description: 'Облако, резервные копии и импорт',
    },
    {
      label: 'Настройки',
      route: '/settings',
      icon: 'tune',
      description: 'Темы, персонализация и резервные копии',
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
