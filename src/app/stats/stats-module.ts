import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { StatsRoutingModule } from './stats-routing-module';
import { Stats } from './stats';
import { StatsListComponent } from './components/stats-list/stats-list.component';
import { StatsEditComponent } from './components/stats-edit/stats-edit.component';
import { StatsDetailsComponent } from './components/stats-details/stats-details.component';
import { StatsDashboard } from './components/stats-dashboard/stats-dashboard';
import { NgxChartsModule } from '@swimlane/ngx-charts';

@NgModule({
  declarations: [Stats, StatsDashboard],
  imports: [
    SharedModule,
    StatsRoutingModule,
    StatsListComponent,
    StatsEditComponent,
    StatsDetailsComponent,
    NgxChartsModule,
  ],
})
export class StatsModule {}
