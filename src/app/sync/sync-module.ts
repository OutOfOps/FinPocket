import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { SyncRoutingModule } from './sync-routing-module';
import { Sync } from './sync';

@NgModule({
  declarations: [Sync],
  imports: [SharedModule, SyncRoutingModule],
})
export class SyncModule {}
