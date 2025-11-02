import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Stats } from './stats';

const routes: Routes = [{ path: '', component: Stats }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StatsRoutingModule { }
