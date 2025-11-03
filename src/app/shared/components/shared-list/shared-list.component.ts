import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-shared-list',
  standalone: true,
  imports: [CommonModule, MatListModule],
  templateUrl: './shared-list.component.html',
  styleUrls: ['./shared-list.component.scss'],
})
export class SharedListComponent {
  readonly utilities = [
    { name: 'TagChipComponent', description: 'Универсальная метка для отображения тегов и статусов.' },
    { name: 'FeatureShellLayoutComponent', description: 'Готовый каркас страницы с заголовком, действиями и содержимым.' },
    { name: 'CurrencyPipe', description: 'Пайп для нормализации валют и локализации вывода сумм.' },
  ];
}
