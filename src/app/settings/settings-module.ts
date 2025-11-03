import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { SettingsRoutingModule } from './settings-routing-module';
import { Settings } from './settings';

@NgModule({
  declarations: [Settings],
  imports: [SharedModule, SettingsRoutingModule],
})
export class SettingsModule {}
