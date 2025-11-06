import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-reset-data-dialog',
  standalone: false,
  template: `
    <h2 mat-dialog-title>Удалить все данные?</h2>
    <mat-dialog-content>
      <p>
        Будут удалены все счета, операции, показатели счётчиков, долги и резервные копии. Настройки
        приложения вернутся к значениям по умолчанию.
      </p>
      <p>Это действие нельзя отменить.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Отмена</button>
      <button mat-raised-button color="warn" type="button" (click)="confirm()">
        Удалить данные
      </button>
    </mat-dialog-actions>
  `,
})
export class ResetDataDialogComponent {
  constructor(private readonly dialogRef: MatDialogRef<ResetDataDialogComponent>) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
