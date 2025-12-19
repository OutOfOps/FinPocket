import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { SharedListComponent } from './components/shared-list/shared-list.component';
import { SharedEditComponent } from './components/shared-edit/shared-edit.component';
import { SharedDetailsComponent } from './components/shared-details/shared-details.component';

const MATERIAL_MODULES = [
  MatToolbarModule,
  MatButtonModule,
  MatIconModule,
  MatSidenavModule,
  MatListModule,
  MatCardModule,
  MatDividerModule,
  MatButtonToggleModule,
  MatSlideToggleModule,
  MatChipsModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatSnackBarModule,
  MatDialogModule,
  MatBottomSheetModule,
  MatTooltipModule,
  MatRippleModule,
  MatProgressSpinnerModule,
  MatMenuModule
];

import { CurrencyRatesDialogComponent } from './components/currency-rates-dialog/currency-rates-dialog.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

const SHARED_STANDALONE = [
  SharedListComponent,
  SharedEditComponent,
  SharedDetailsComponent
];

@NgModule({
  declarations: [CurrencyRatesDialogComponent, ConfirmDialogComponent],
  imports: [CommonModule, RouterModule, FormsModule, ...MATERIAL_MODULES, ...SHARED_STANDALONE],
  exports: [CommonModule, RouterModule, FormsModule, ...MATERIAL_MODULES, ...SHARED_STANDALONE, CurrencyRatesDialogComponent, ConfirmDialogComponent],
})
export class SharedModule { }
