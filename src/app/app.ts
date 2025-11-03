import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ThemeService } from './core/services/theme.service';

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
export class App {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly themeService = inject(ThemeService);

  protected readonly activeTheme = this.themeService.theme;

  protected readonly isHandset = toSignal(
    this.breakpointObserver
      .observe(['(max-width: 959px)'])
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  protected readonly title = 'FinPocket';

  protected readonly navItems: NavigationItem[] = [
    {
      label: 'Финансы',
      route: '/finance',
      icon: 'account_balance_wallet',
      description: 'Транзакции, счета и бюджеты',
    },
    {
      label: 'Долги',
      route: '/debts',
      icon: 'handshake',
      description: 'Обязательства и напоминания по займам',
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
}
