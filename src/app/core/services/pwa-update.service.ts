import { Injectable, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);
  private readonly checkIntervalMs = 300000; // Check every 5 minutes

  /**
   * Signal that becomes true when an update has been found and is ready for activation.
   */
  readonly isUpdateAvailable = signal<boolean>(false);

  /**
   * Signal that becomes true when an update is currently being downloaded.
   */
  readonly isDownloading = signal<boolean>(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.triggerUpdateCheck();

      // Check for updates periodically
      interval(this.checkIntervalMs)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.triggerUpdateCheck();
        });

      // Listen for available updates
      this.swUpdate.versionUpdates
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          switch (event.type) {
            case 'VERSION_DETECTED':
              console.log('Downloading new version...');
              this.isDownloading.set(true);
              break;
            case 'VERSION_READY':
              console.log('New version available:', event);
              this.isDownloading.set(false);
              this.isUpdateAvailable.set(true);
              break;
            case 'VERSION_INSTALLATION_FAILED':
              console.error('Failed to install version:', event.error);
              this.isDownloading.set(false);
              break;
            case 'NO_NEW_VERSION_DETECTED':
              this.isDownloading.set(false);
              break;
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

  private triggerUpdateCheck(): void {
    void this.swUpdate
      .checkForUpdate()
      .then(() => {
        console.log('Checked for updates');
      })
      .catch((err) => {
        console.error('Error checking for updates:', err);
      });
  }
}
