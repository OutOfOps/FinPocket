import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Sync } from './sync';

const routes: Routes = [{ path: '', component: Sync }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SyncRoutingModule { }
