import { Component } from '@angular/core';

@Component({
  selector: 'app-shared-edit',
  templateUrl: './shared-edit.component.html',
  styleUrls: ['./shared-edit.component.scss'],
})
export class SharedEditComponent {
  readonly scaffolding = [
    { name: 'SharedModule', description: 'Собирает Angular Material и общие компоненты для переиспользования.' },
    { name: 'SkeletonLoaderComponent', description: 'Анимированный скелетон для состояний загрузки.' },
    { name: 'InputErrorPipe', description: 'Человеко-понятные сообщения валидации форм.' },
  ];
}
