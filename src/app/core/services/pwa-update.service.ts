import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);
  private readonly checkIntervalMs = 60000; // Check every minute

  constructor() {
    if (this.swUpdate.isEnabled) {
      // Check for updates periodically
      interval(this.checkIntervalMs)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.swUpdate.checkForUpdate().then(() => {
            console.log('Checked for updates');
          }).catch(err => {
            console.error('Error checking for updates:', err);
          });
        });

      // Listen for available updates
      this.swUpdate.versionUpdates
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (event.type === 'VERSION_READY') {
            console.log('New version available:', event);
          }
        });
    }
  }

  /**
   * Get observable for version updates
   */
  get versionUpdates() {
    return this.swUpdate.versionUpdates;
  }

  /**
   * Check for updates manually
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }
    return await this.swUpdate.checkForUpdate();
  }

  /**
   * Activate the latest version
   */
  async activateUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }
    return await this.swUpdate.activateUpdate();
  }
}
