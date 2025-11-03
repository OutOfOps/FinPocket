import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Stats } from './stats';
import { StatsListComponent } from './components/stats-list/stats-list.component';
import { StatsEditComponent } from './components/stats-edit/stats-edit.component';
import { StatsDetailsComponent } from './components/stats-details/stats-details.component';

const routes: Routes = [
  {
    path: '',
    component: Stats,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      { path: 'list', component: StatsListComponent },
      { path: 'create', component: StatsEditComponent },
      { path: 'weekly', component: StatsDetailsComponent },
      { path: ':id/edit', component: StatsEditComponent },
      { path: ':id', component: StatsDetailsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StatsRoutingModule {}
