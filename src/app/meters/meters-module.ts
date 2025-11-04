import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { MetersRoutingModule } from './meters-routing-module';
import { Meters } from './meters';
import { MetersListComponent } from './components/meters-list/meters-list.component';
import MetersEditComponent from './components/meters-edit/meters-edit.component';
import { MetersDetailsComponent } from './components/meters-details/meters-details.component';

@NgModule({
  declarations: [Meters],
  imports: [
    SharedModule,
    MetersRoutingModule,
    MetersListComponent,
    MetersEditComponent,
    MetersDetailsComponent,
  ],
})
export class MetersModule {}
