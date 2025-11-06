import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ThemeService } from './core/services/theme.service';
import { MatSidenav } from '@angular/material/sidenav';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
})
export class App implements OnInit {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly themeService = inject(ThemeService);
  private readonly pwaUpdateService = inject(PwaUpdateService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly activeTheme = this.themeService.theme;

  protected readonly isHandset = toSignal(
    this.breakpointObserver
      .observe(['(max-width: 959px)'])
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  protected readonly title = 'FinPocket';
  protected readonly appVersion = 'v0.1.33';
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
    this.pwaUpdateService.versionUpdates.subscribe((event) => {
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

        snackBarRef.onAction().subscribe(() => {
          this.pwaUpdateService.activateUpdate().then(() => {
            window.location.reload();
          });
        });
      }
    });
  }

  protected async onNavItemSelect(drawer: MatSidenav): Promise<void> {
    if (!this.isHandset()) {
      return;
    }

    await drawer.close();
  }
}
