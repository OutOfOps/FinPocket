import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Settings } from './settings';

const routes: Routes = [
  { path: '', component: Settings },
  { path: 'about', loadComponent: () => import('./components/about/about.component').then(m => m.AboutComponent) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule { }
