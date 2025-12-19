import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Finance } from './finance';
import { FinanceListComponent } from './components/finance-list/finance-list.component';
import { FinanceStatsComponent } from './components/finance-stats/finance-stats.component';
import { SubscriptionsListComponent } from './components/subscriptions-list/subscriptions-list.component';
import { SubscriptionsEditComponent } from './components/subscriptions-edit/subscriptions-edit.component';
import { FinanceEditComponent } from './components/finance-edit/finance-edit.component';
import { FinanceDetailsComponent } from './components/finance-details/finance-details.component';

const routes: Routes = [
  {
    path: '',
    component: Finance,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      { path: 'list', component: FinanceListComponent },
      { path: 'stats', component: FinanceStatsComponent },
      { path: 'subscriptions', component: SubscriptionsListComponent },
      { path: 'subscriptions/create', component: SubscriptionsEditComponent },
      { path: 'subscriptions/:id/edit', component: SubscriptionsEditComponent },
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
