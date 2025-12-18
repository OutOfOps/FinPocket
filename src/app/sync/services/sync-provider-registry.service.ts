import { Injectable } from '@angular/core';
import { CloudProvider } from '../cloud-provider';
import { GDriveProvider } from '../gdrive.provider';
import { SyncSettingsService } from './sync-settings.service';

@Injectable({ providedIn: 'root' })
export class SyncProviderRegistryService {
  private readonly cache = new Map<CloudProvider['id'], CloudProvider>();
  private cachedGDriveClientId?: string;

  constructor(private readonly settings: SyncSettingsService) { }

  listProviders(): CloudProvider[] {
    const providers: CloudProvider[] = [];
    const gdriveClientId = this.settings.getGoogleDriveClientId();
    if (gdriveClientId) {
      providers.push(this.ensureGDriveProvider(gdriveClientId));
    }

    return providers;
  }

  getProvider(id: CloudProvider['id']): CloudProvider | null {
    switch (id) {
      case 'gdrive': {
        const clientId = this.settings.getGoogleDriveClientId();
        if (!clientId) {
          return null;
        }
        return this.ensureGDriveProvider(clientId);
      }
      default:
        return null;
    }
  }

  invalidate(id?: CloudProvider['id']): void {
    if (!id || id === 'gdrive') {
      this.cache.delete('gdrive');
      this.cachedGDriveClientId = undefined;
    }

    if (!id) {
      this.cache.clear();
    }
  }

  private ensureGDriveProvider(clientId: string): CloudProvider {
    const clientSecret = this.settings.getGoogleDriveClientSecret();
    if (this.cachedGDriveClientId === clientId) {
      const cached = this.cache.get('gdrive');
      if (cached) {
        return cached;
      }
    }

    const provider = new GDriveProvider({ clientId, clientSecret });
    this.cachedGDriveClientId = clientId;
    this.cache.set('gdrive', provider);
    return provider;
  }
}
