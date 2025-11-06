import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { SyncRoutingModule } from './sync-routing-module';
import { Sync } from './sync';
import { SyncListComponent } from './components/sync-list/sync-list.component';
import { SyncEditComponent } from './components/sync-edit/sync-edit.component';
import { SyncDetailsComponent } from './components/sync-details/sync-details.component';
import { SyncAccountComponent } from './components/sync-account/sync-account.component';

@NgModule({
  declarations: [Sync],
  imports: [
    SharedModule,
    SyncRoutingModule,
    SyncListComponent,
    SyncEditComponent,
    SyncDetailsComponent,
    SyncAccountComponent,
  ],
})
export class SyncModule {}
