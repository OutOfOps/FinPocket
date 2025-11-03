import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '../../../shared/shared-module';
import { MeterType, MeterTypeOption } from '../../models/meter-reading';
import { MetersStoreService } from '../../services/meters-store.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface MeterForm {
  id?: string;
  object: string;
  type: MeterType;
  value: number;
  unit: string;
  submittedAt: string;
}

@Component({
  selector: 'app-meters-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './meters-edit.component.html',
  styleUrls: ['./meters-edit.component.scss'],
})
export class MetersEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(MetersStoreService);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeOptions: MeterTypeOption[] = this.store.typeOptions;
  form: MeterForm = this.createDefaultForm();
  readonly objectOptions$ = this.store.objectOptions$;
  isEditMode = false;

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        this.isEditMode = !!id;

        if (id) {
          this.patchFromExisting(id);
        } else {
          this.form = this.createDefaultForm();
        }
      });
  }

  updateType(type: MeterForm['type']): void {
    const config = this.typeOptions.find((option) => option.type === type);
    if (!config) {
      return;
    }

    this.form.type = config.type;
    this.form.unit = config.unit;
  }

  submit(): void {
    const saved = this.store.upsertReading(this.form);
    this.form = { ...saved };
    this.router.navigate(['../list'], { relativeTo: this.route });
  }

  trackObject(_: number, option: string): string {
    return option;
  }

  private createDefaultForm(): MeterForm {
    const defaultType = this.typeOptions[0];
    return {
      object: this.store.getDefaultObject(),
      type: defaultType.type,
      value: 0,
      unit: defaultType.unit,
      submittedAt: new Date().toISOString().substring(0, 10),
    };
  }

  private patchFromExisting(id: string): void {
    const reading = this.store.getReadingById(id);
    if (!reading) {
      return;
    }

    this.form = {
      id: reading.id,
      object: reading.object,
      type: reading.type,
      value: reading.value,
      unit: reading.unit,
      submittedAt: reading.submittedAt,
    };
  }
}
