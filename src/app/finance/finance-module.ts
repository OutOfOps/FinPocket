import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { FinanceRoutingModule } from './finance-routing-module';
import { Finance } from './finance';

@NgModule({
  declarations: [Finance],
  imports: [SharedModule, FinanceRoutingModule],
})
export class FinanceModule {}
