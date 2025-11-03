import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-shared-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shared-details.component.html',
  styleUrls: ['./shared-details.component.scss'],
})
export class SharedDetailsComponent {
  readonly conventions = [
    'Компоненты именуются в PascalCase и группируются по фичам.',
    'Пайпы хранятся в директории shared/pipes и экспортируются через SharedModule.',
    'Общие стили оформлены в finpocket-theme.scss и подключаются глобально.',
  ];
}
