import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

@Component({
  selector: 'app-meters-details',
  standalone: true,
  imports: [SharedModule],
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
