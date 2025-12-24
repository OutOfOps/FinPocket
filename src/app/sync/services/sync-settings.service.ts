import { Injectable } from '@angular/core';

type ProviderId = 'gdrive' | 'onedrive' | 'dropbox';

interface ProviderSettings {
  clientId?: string;
  clientSecret?: string;
}

interface PersistedSyncSettings {
  version: number;
  encryptionEnabled?: boolean;
  masterPassword?: string;
  syncIntervalMin?: number; // 0 = disabled
  retentionDays?: number; // 0 = infinite
  autoSyncEnabled?: boolean;
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
    const normalizedStored = stored ? this.normalizeInput(stored) : undefined;
    if (normalizedStored && normalizedStored.length > 0) {
      return normalizedStored;
    }

    return this.resolveValueFromEnvironment('clientId');
  }

  setGoogleDriveClientId(clientId: string | null | undefined): void {
    const next = this.read();
    if (!clientId) {
      delete next.providers.gdrive?.clientId;
    } else {
      const normalized = this.normalizeInput(clientId);
      if (!normalized) {
        delete next.providers.gdrive?.clientId;
      } else {
        if (!next.providers.gdrive) next.providers.gdrive = {};
        next.providers.gdrive.clientId = normalized;
      }
    }
    this.write(next);
  }

  getGoogleDriveClientSecret(): string | undefined {
    const stored = this.read().providers.gdrive?.clientSecret;
    const normalizedStored = stored ? this.normalizeInput(stored) : undefined;
    if (normalizedStored && normalizedStored.length > 0) {
      return normalizedStored;
    }

    return this.resolveValueFromEnvironment('clientSecret');
  }

  setGoogleDriveClientSecret(clientSecret: string | null | undefined): void {
    const next = this.read();
    if (!clientSecret) {
      delete next.providers.gdrive?.clientSecret;
    } else {
      const normalized = this.normalizeInput(clientSecret);
      if (!normalized) {
        delete next.providers.gdrive?.clientSecret;
      } else {
        if (!next.providers.gdrive) next.providers.gdrive = {};
        next.providers.gdrive.clientSecret = normalized;
      }
    }
    this.write(next);
  }

  getMasterPassword(): string | undefined {
    return this.read().masterPassword;
  }

  setMasterPassword(password: string | null | undefined): void {
    const next = this.read();
    next.masterPassword = password || undefined;
    this.write(next);
  }

  getSyncInterval(): number {
    return this.read().syncIntervalMin ?? 60; // Default 1 hour
  }

  setSyncInterval(min: number): void {
    const next = this.read();
    next.syncIntervalMin = min;
    this.write(next);
  }

  getRetentionDays(): number {
    return this.read().retentionDays ?? 30; // Default 30 days
  }

  setRetentionDays(days: number): void {
    const next = this.read();
    next.retentionDays = days;
    this.write(next);
  }

  getAutoSyncEnabled(): boolean {
    return this.read().autoSyncEnabled ?? true;
  }

  setAutoSyncEnabled(enabled: boolean): void {
    const next = this.read();
    next.autoSyncEnabled = enabled;
    this.write(next);
  }

  reset(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
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
        ...this.empty(),
        ...parsed,
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
      syncIntervalMin: 60,
      retentionDays: 30,
      autoSyncEnabled: true,
    };
  }

  private resolveValueFromEnvironment(key: 'clientId' | 'clientSecret'): string | undefined {
    const globalThisAny = globalThis as any;
    const suffix = key === 'clientId' ? 'ClientId' : 'ClientSecret';
    const envKey = key === 'clientId' ? 'GDRIVE_CLIENT_ID' : 'GDRIVE_CLIENT_SECRET';

    const candidates: Array<unknown> = [
      globalThisAny?.finPocketConfig?.[key],
      globalThisAny?.FINPOCKET_CONFIG?.[key],
      globalThisAny?.finPocketEnv?.[key],
      globalThisAny?.[`FINPOCKET_${envKey}`],
      globalThisAny?.[`NG_APP_${envKey}`],
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const normalized = this.normalizeInput(candidate);
        if (normalized.length > 0) return normalized;
      }
    }

    if (typeof document !== 'undefined') {
      const metaName = `finpocket-gdrive-${key === 'clientId' ? 'client-id' : 'client-secret'}`;
      const meta = document.querySelector(`meta[name="${metaName}"]`);
      const content = meta?.getAttribute('content');
      if (content) {
        const normalized = this.normalizeInput(content);
        if (normalized.length > 0) return normalized;
      }
    }

    return undefined;
  }

  private normalizeInput(value: string): string {
    return value
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/\s+/g, '');
  }
}
