import { Component } from '@angular/core';

@Component({
  selector: 'app-meters-details',
  templateUrl: './meters-details.component.html',
  styleUrls: ['./meters-details.component.scss'],
})
export class MetersDetailsComponent {
  readonly history = [
    { period: 'Январь 2024', consumption: 205, unit: 'кВт·ч' },
    { period: 'Февраль 2024', consumption: 198, unit: 'кВт·ч' },
    { period: 'Март 2024', consumption: 215, unit: 'кВт·ч' },
  ];
}
