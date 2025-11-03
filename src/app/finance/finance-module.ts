import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { FinanceRoutingModule } from './finance-routing-module';
import { Finance } from './finance';
import { FinanceListComponent } from './components/finance-list/finance-list.component';
import { FinanceEditComponent } from './components/finance-edit/finance-edit.component';
import { FinanceDetailsComponent } from './components/finance-details/finance-details.component';

@NgModule({
  declarations: [Finance],
  imports: [
    SharedModule,
    FinanceRoutingModule,
    FinanceListComponent,
    FinanceEditComponent,
    FinanceDetailsComponent,
  ],
})
export class FinanceModule {}
