import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { DebtsRoutingModule } from './debts-routing-module';
import { Debts } from './debts';

@NgModule({
  declarations: [Debts],
  imports: [SharedModule, DebtsRoutingModule],
})
export class DebtsModule {}
