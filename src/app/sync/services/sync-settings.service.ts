import { Injectable } from '@angular/core';

type ProviderId = 'gdrive' | 'onedrive' | 'dropbox';

interface ProviderSettings {
  clientId?: string;
}

interface PersistedSyncSettings {
  version: number;
  encryptionEnabled?: boolean;
  providers: Record<ProviderId, ProviderSettings | undefined>;
}

const STORAGE_KEY = 'finpocket.sync.settings.v1';
const STORAGE_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class SyncSettingsService {
  getEncryptionEnabled(): boolean {
    return this.read().encryptionEnabled ?? true;
  }

  setEncryptionEnabled(enabled: boolean): void {
    const next = this.read();
    next.encryptionEnabled = enabled;
    this.write(next);
  }

  getGoogleDriveClientId(): string | undefined {
    const stored = this.read().providers.gdrive?.clientId;
    const normalizedStored = stored ? this.normalizeGoogleDriveClientId(stored) : undefined;
    if (normalizedStored && normalizedStored.length > 0) {
      return normalizedStored;
    }

    return this.resolveClientIdFromEnvironment();
  }

  setGoogleDriveClientId(clientId: string | null | undefined): void {
    const next = this.read();
    if (!clientId) {
      delete next.providers.gdrive?.clientId;
      if (!next.providers.gdrive) {
        next.providers.gdrive = {};
      }
    } else {
      const normalized = this.normalizeGoogleDriveClientId(clientId);
      if (!normalized) {
        delete next.providers.gdrive?.clientId;
        if (!next.providers.gdrive) {
          next.providers.gdrive = {};
        }
        this.write(next);
        return;
      }

      if (!next.providers.gdrive) {
        next.providers.gdrive = {};
      }
      next.providers.gdrive.clientId = normalized;
    }

    this.write(next);
  }

  private read(): PersistedSyncSettings {
    if (typeof window === 'undefined') {
      return this.empty();
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return this.empty();
      }

      const parsed = JSON.parse(raw) as PersistedSyncSettings | null;
      if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.providers) {
        return this.empty();
      }

      return {
        version: STORAGE_VERSION,
        encryptionEnabled: parsed.encryptionEnabled,
        providers: parsed.providers,
      };
    } catch {
      return this.empty();
    }
  }

  private write(settings: PersistedSyncSettings): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors (e.g. private mode)
    }
  }

  private empty(): PersistedSyncSettings {
    return {
      version: STORAGE_VERSION,
      providers: {
        gdrive: {},
        onedrive: {},
        dropbox: {},
      },
      encryptionEnabled: true,
    };
  }

  private resolveClientIdFromEnvironment(): string | undefined {
    const globalThisAny = globalThis as any;
    const candidates: Array<unknown> = [
      globalThisAny?.finPocketConfig?.gdriveClientId,
      globalThisAny?.finPocketEnv?.gdriveClientId,
      globalThisAny?.FINPOCKET_GDRIVE_CLIENT_ID,
      globalThisAny?.NG_APP_GDRIVE_CLIENT_ID,
    ];

    for (const candidate of candidates) {
      const value = this.normalizeCandidate(candidate);
      if (value) {
        return value;
      }
    }

    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="finpocket-gdrive-client-id"]');
      const content = meta?.getAttribute('content');
      const normalized = this.normalizeCandidate(content);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private normalizeCandidate(candidate: unknown): string | undefined {
    if (typeof candidate === 'string') {
      const normalized = this.normalizeGoogleDriveClientId(candidate);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return undefined;
  }

  private normalizeGoogleDriveClientId(clientId: string): string {
    return clientId
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/\s+/g, '');
  }
}
