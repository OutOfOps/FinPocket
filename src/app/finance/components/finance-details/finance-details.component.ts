import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

@Component({
  selector: 'app-finance-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './finance-details.component.html',
  styleUrls: ['./finance-details.component.scss'],
})
export class FinanceDetailsComponent {
  readonly scenario = {
    id: 'scenario-monthly-budget',
    title: 'Март 2024',
    plannedIncome: 215000,
    plannedExpenses: 172500,
    actualIncome: 205400,
    actualExpenses: 164200,
    comment: 'Основные перерасходы пришлись на транспорт и сервисы подписок.',
  };

  get balanceDelta(): number {
    return (this.scenario.actualIncome - this.scenario.actualExpenses) - (this.scenario.plannedIncome - this.scenario.plannedExpenses);
  }
}
