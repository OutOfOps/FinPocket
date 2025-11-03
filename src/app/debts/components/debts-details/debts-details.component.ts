import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

@Component({
  selector: 'app-debts-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './debts-details.component.html',
  styleUrls: ['./debts-details.component.scss'],
})
export class DebtsDetailsComponent {
  readonly timeline = [
    { date: '2024-01-12', action: 'Выдан займ', amount: 150000 },
    { date: '2024-02-10', action: 'Частичное погашение', amount: -35000 },
    { date: '2024-03-01', action: 'Напоминание отправлено', amount: 0 },
  ];
}
