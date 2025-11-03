import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { DebtsRoutingModule } from './debts-routing-module';
import { Debts } from './debts';
import { DebtsListComponent } from './components/debts-list/debts-list.component';
import { DebtsEditComponent } from './components/debts-edit/debts-edit.component';
import { DebtsDetailsComponent } from './components/debts-details/debts-details.component';

@NgModule({
  declarations: [Debts, DebtsListComponent, DebtsEditComponent, DebtsDetailsComponent],
  imports: [SharedModule, DebtsRoutingModule],
})
export class DebtsModule {}
