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
];

const SHARED_COMPONENTS = [SharedListComponent, SharedEditComponent, SharedDetailsComponent];

@NgModule({
  imports: [CommonModule, RouterModule, FormsModule, ...MATERIAL_MODULES, ...SHARED_COMPONENTS],
  exports: [CommonModule, RouterModule, FormsModule, ...MATERIAL_MODULES, ...SHARED_COMPONENTS],
})
export class SharedModule {}
