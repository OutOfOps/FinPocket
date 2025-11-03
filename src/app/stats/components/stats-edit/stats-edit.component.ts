import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';

interface WidgetConfig {
  id: string;
  title: string;
  enabled: boolean;
}

@Component({
  selector: 'app-stats-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './stats-edit.component.html',
  styleUrls: ['./stats-edit.component.scss'],
})
export class StatsEditComponent {
  readonly widgets: WidgetConfig[] = [
    { id: 'expenses', title: 'Расходы по категориям', enabled: true },
    { id: 'debts', title: 'Динамика долгов', enabled: true },
    { id: 'consumption', title: 'Потребление ресурсов', enabled: false },
  ];

  toggleWidget(widget: WidgetConfig): void {
    widget.enabled = !widget.enabled;
  }

  save(): void {
    console.info('Сохранение настроек дашборда', this.widgets);
  }
}
