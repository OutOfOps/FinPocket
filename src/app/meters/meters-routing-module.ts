import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Meters } from './meters';
import { MetersListComponent } from './components/meters-list/meters-list.component';
import MetersEditComponent from './components/meters-edit/meters-edit.component';
import { MetersDetailsComponent } from './components/meters-details/meters-details.component';
import { MetersResourcesComponent } from './components/meters-resources/meters-resources.component';

const routes: Routes = [
  {
    path: '',
    component: Meters,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      { path: 'list', component: MetersListComponent },
      { path: 'create', component: MetersEditComponent },
      { path: 'resources', component: MetersResourcesComponent },
      { path: ':id/edit', component: MetersEditComponent },
      { path: ':id', component: MetersDetailsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MetersRoutingModule {}
