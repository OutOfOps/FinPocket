import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { MetersRoutingModule } from './meters-routing-module';
import { Meters } from './meters';

@NgModule({
  declarations: [Meters],
  imports: [SharedModule, MetersRoutingModule],
})
export class MetersModule {}
