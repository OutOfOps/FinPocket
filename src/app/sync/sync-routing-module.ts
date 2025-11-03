import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Sync } from './sync';
import { SyncListComponent } from './components/sync-list/sync-list.component';
import { SyncEditComponent } from './components/sync-edit/sync-edit.component';
import { SyncDetailsComponent } from './components/sync-details/sync-details.component';

const routes: Routes = [
  {
    path: '',
    component: Sync,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      { path: 'list', component: SyncListComponent },
      { path: 'create', component: SyncEditComponent },
      { path: 'last-restore', component: SyncDetailsComponent },
      { path: ':id/edit', component: SyncEditComponent },
      { path: ':id', component: SyncDetailsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncRoutingModule {}
