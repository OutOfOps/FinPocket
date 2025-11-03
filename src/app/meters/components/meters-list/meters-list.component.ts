import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { MetersStoreService } from '../../services/meters-store.service';
import { MeterReading } from '../../models/meter-reading';

@Component({
  selector: 'app-meters-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-list.component.html',
  styleUrls: ['./meters-list.component.scss'],
})
export class MetersListComponent {
  private readonly store = inject(MetersStoreService);

  readonly readings$ = this.store.readings$;

  typeLabel(type: MeterReading['type']): string {
    return this.store.typeLabel(type);
  }

  trackReading(_: number, reading: MeterReading): string {
    return reading.id;
  }
}
