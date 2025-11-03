import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { StatsRoutingModule } from './stats-routing-module';
import { Stats } from './stats';
import { StatsListComponent } from './components/stats-list/stats-list.component';
import { StatsEditComponent } from './components/stats-edit/stats-edit.component';
import { StatsDetailsComponent } from './components/stats-details/stats-details.component';

@NgModule({
  declarations: [Stats],
  imports: [
    SharedModule,
    StatsRoutingModule,
    StatsListComponent,
    StatsEditComponent,
    StatsDetailsComponent,
  ],
})
export class StatsModule {}
