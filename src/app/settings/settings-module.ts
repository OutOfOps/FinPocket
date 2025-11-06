import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared-module';
import { SettingsRoutingModule } from './settings-routing-module';
import { Settings } from './settings';
import { ResetDataDialogComponent } from './components/reset-data-dialog/reset-data-dialog.component';

@NgModule({
  declarations: [Settings, ResetDataDialogComponent],
  imports: [SharedModule, SettingsRoutingModule],
})
export class SettingsModule {}
