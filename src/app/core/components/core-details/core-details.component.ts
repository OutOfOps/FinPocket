import { Component } from '@angular/core';

@Component({
  selector: 'app-core-details',
  templateUrl: './core-details.component.html',
  styleUrls: ['./core-details.component.scss'],
})
export class CoreDetailsComponent {
  readonly architectureNotes = [
    'CoreModule загружается один раз в AppModule и содержит синглтоны.',
    'Services используют HttpClient и RxJS для реактивных потоков данных.',
    'Утилиты размещаются в core/utils и покрывают форматирование, даты и локализацию.',
  ];
}
