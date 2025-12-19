import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Finance } from './finance';
import { FinanceListComponent } from './components/finance-list/finance-list.component';
import { FinanceEditComponent } from './components/finance-edit/finance-edit.component';
import { FinanceDetailsComponent } from './components/finance-details/finance-details.component';
import { FinanceStatsComponent } from './components/finance-stats/finance-stats.component';

const routes: Routes = [
  {
    path: '',
    component: Finance,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      { path: 'list', component: FinanceListComponent },
      { path: 'stats', component: FinanceStatsComponent },
      { path: 'create', component: FinanceEditComponent },
      { path: ':id/edit', component: FinanceEditComponent },
      { path: ':id', component: FinanceDetailsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinanceRoutingModule { }
