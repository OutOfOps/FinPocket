import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthCallbackGdriveComponent } from './auth/auth-callback-gdrive.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'finance' },
  {
    path: 'finance',
    loadChildren: () => import('./finance/finance-module').then((m) => m.FinanceModule),
  },
  {
    path: 'debts',
    loadChildren: () => import('./debts/debts-module').then((m) => m.DebtsModule),
  },
  {
    path: 'meters',
    loadChildren: () => import('./meters/meters-module').then((m) => m.MetersModule),
  },
  {
    path: 'stats',
    loadChildren: () => import('./stats/stats-module').then((m) => m.StatsModule),
  },
  {
    path: 'sync',
    loadChildren: () => import('./sync/sync-module').then((m) => m.SyncModule),
  },
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings-module').then((m) => m.SettingsModule),
  },
  {
    path: 'auth/callback/gdrive',
    component: AuthCallbackGdriveComponent,
  },
  { path: '**', redirectTo: 'finance' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
