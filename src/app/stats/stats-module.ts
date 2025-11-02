import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { StatsRoutingModule } from './stats-routing-module';
import { Stats } from './stats';

@NgModule({
  declarations: [Stats],
  imports: [SharedModule, StatsRoutingModule],
})
export class StatsModule {}
