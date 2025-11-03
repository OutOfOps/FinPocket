import { Component } from '@angular/core';

@Component({
  selector: 'app-stats-details',
  templateUrl: './stats-details.component.html',
  styleUrls: ['./stats-details.component.scss'],
})
export class StatsDetailsComponent {
  readonly dataPoints = [
    { label: 'Неделя 1', expenses: 41000, debts: 32000, consumption: 180 },
    { label: 'Неделя 2', expenses: 38000, debts: 31000, consumption: 190 },
    { label: 'Неделя 3', expenses: 42000, debts: 30000, consumption: 205 },
    { label: 'Неделя 4', expenses: 43000, debts: 29500, consumption: 215 },
  ];
}
