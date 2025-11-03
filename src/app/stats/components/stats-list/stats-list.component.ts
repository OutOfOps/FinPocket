import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

interface ChartCard {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

@Component({
  selector: 'app-stats-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './stats-list.component.html',
  styleUrls: ['./stats-list.component.scss'],
})
export class StatsListComponent {
  readonly charts: ChartCard[] = [
    {
      title: 'Расходы за месяц',
      value: '164 200 ₽',
      trend: 'down',
      description: 'На 4% меньше, чем в феврале',
    },
    {
      title: 'Долговая нагрузка',
      value: '22%',
      trend: 'stable',
      description: 'В пределах рекомендованного коридора',
    },
    {
      title: 'Потребление энергии',
      value: '215 кВт·ч',
      trend: 'up',
      description: 'Рост из-за отопительного сезона',
    },
  ];
}
