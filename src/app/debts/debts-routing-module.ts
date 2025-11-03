import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Debts } from './debts';
import { DebtsListComponent } from './components/debts-list/debts-list.component';
import { DebtsEditComponent } from './components/debts-edit/debts-edit.component';
import { DebtsDetailsComponent } from './components/debts-details/debts-details.component';

const routes: Routes = [
  {
    path: '',
    component: Debts,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      { path: 'list', component: DebtsListComponent },
      { path: 'create', component: DebtsEditComponent },
      { path: ':id/edit', component: DebtsEditComponent },
      { path: ':id', component: DebtsDetailsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DebtsRoutingModule {}
