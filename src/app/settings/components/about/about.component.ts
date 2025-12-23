import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { APP_VERSION } from '../../../core/tokens/app-version.token';

@Component({
    selector: 'app-about',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, RouterModule],
    templateUrl: './about.component.html',
    styleUrl: './about.component.scss'
})
export class AboutComponent {
    protected readonly appVersion = inject(APP_VERSION);

    protected readonly features = [
        {
            icon: 'account_balance_wallet',
            title: 'Управление финансами',
            description: 'Учёт доходов и расходов по категориям, поддержка мультивалютности и автоматическое обновление курсов валют.'
        },
        {
            icon: 'handshake',
            title: 'Долги и займы',
            description: 'Контроль задолженностей, история выплат и напоминания о сроках.'
        },
        {
            icon: 'bolt',
            title: 'Коммунальные услуги',
            description: 'Учёт показаний счётчиков, настройка сложных тарифов (день/ночь) и расчёт стоимости потребления.'
        },
        {
            icon: 'bar_chart',
            title: 'Аналитика',
            description: 'Наглядные графики и диаграммы для анализа структуры расходов, динамики баланса и потребления ресурсов.'
        },
        {
            icon: 'cloud_sync',
            title: 'Google Drive Sync',
            description: 'Надежное хранение данных и синхронизация между устройствами через ваш личный облачный диск.'
        }
    ];

    protected readonly versionHistory = [
        {
            version: 'v1.0.0',
            date: 'Декабрь 2025',
            changes: [
                'Официальный релиз 1.0',
                'Рефакторинг на Сигналы (Angular Signals)',
                'Полная поддержка светлой и темной тем',
                'Улучшенная установка PWA и уведомления об обновлениях',
                'Исправлена адаптивность графиков на мобильных устройствах'
            ]
        },
        {
            version: 'v0.0.214',
            date: 'Декабрь 2025',
            changes: [
                'Добавлена страница "О программе"',
                'Реализованы начальные показания для счётчиков',
                'Оптимизация производительности'
            ]
        },
        {
            version: 'v0.0.180',
            date: 'Ноябрь 2025',
            changes: [
                'Внедрена синхронизация с Google Drive',
                'Добавлен модуль коммунальных услуг (V2)',
                'Обновлен дизайн интерфейса'
            ]
        },
        {
            version: 'v0.0.1',
            date: 'Октябрь 2025',
            changes: [
                'Первая публичная версия',
                'Учёт финансов и долгов'
            ]
        }
    ];
}
