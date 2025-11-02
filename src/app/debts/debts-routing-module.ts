import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Debts } from './debts';

const routes: Routes = [{ path: '', component: Debts }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DebtsRoutingModule { }
