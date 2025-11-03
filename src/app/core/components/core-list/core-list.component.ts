import { Component } from '@angular/core';

@Component({
  selector: 'app-core-list',
  templateUrl: './core-list.component.html',
  styleUrls: ['./core-list.component.scss'],
})
export class CoreListComponent {
  readonly services = [
    { name: 'AccountsService', description: 'API для работы со счетами, балансами и валютами.' },
    { name: 'TransactionsService', description: 'Загрузка, фильтрация и запись финансовых операций.' },
    { name: 'SyncService', description: 'Интерфейс взаимодействия с облачными провайдерами.' },
  ];
}
