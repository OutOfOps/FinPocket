import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Meters } from './meters';

const routes: Routes = [{ path: '', component: Meters }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MetersRoutingModule { }
