import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LayoutModule } from '@angular/cdk/layout';
import { OverlayModule } from '@angular/cdk/overlay';
import { SharedModule } from '../shared/shared-module';
import { CoreListComponent } from './components/core-list/core-list.component';
import { CoreEditComponent } from './components/core-edit/core-edit.component';
import { CoreDetailsComponent } from './components/core-details/core-details.component';

@NgModule({
  declarations: [CoreListComponent, CoreEditComponent, CoreDetailsComponent],
  imports: [CommonModule, HttpClientModule, LayoutModule, OverlayModule, SharedModule],
  exports: [CoreListComponent, CoreEditComponent, CoreDetailsComponent],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule | null) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it only in AppModule.');
    }
  }
}
