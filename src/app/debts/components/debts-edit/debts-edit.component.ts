import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

interface DebtForm {
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
  participants: string[];
  status: 'active' | 'paid' | 'overdue';
}

@Component({
  selector: 'app-debts-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './debts-edit.component.html',
  styleUrls: ['./debts-edit.component.scss'],
})
export class DebtsEditComponent {
  readonly model: DebtForm = {
    name: '',
    amount: 0,
    currency: '₴',
    dueDate: new Date().toISOString().substring(0, 10),
    participants: ['Вы'],
    status: 'active',
  };

  readonly statusOptions: DebtForm['status'][] = ['active', 'paid', 'overdue'];

  addParticipant(): void {
    this.model.participants = [...this.model.participants, 'Новый участник'];
  }

  trackStatus(index: number, status: DebtForm['status']): string {
    return status;
  }

  statusLabel(status: DebtForm['status']): string {
    switch (status) {
      case 'active':
        return 'В процессе';
      case 'paid':
        return 'Закрыт';
      case 'overdue':
        return 'Просрочен';
    }
  }

  submit(): void {
    console.info('Сохранение долга', this.model);
  }
}
