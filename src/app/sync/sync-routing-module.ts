import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Sync } from './sync';
import { SyncListComponent } from './components/sync-list/sync-list.component';
import { SyncEditComponent } from './components/sync-edit/sync-edit.component';
import { SyncDetailsComponent } from './components/sync-details/sync-details.component';
import { SyncAccountComponent } from './components/sync-account/sync-account.component';

const routes: Routes = [
  {
    path: '',
    component: Sync,
    children: [],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncRoutingModule { }
