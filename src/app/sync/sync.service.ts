import { Injectable, inject } from '@angular/core';
import {
  FinPocketDB,
  BackupEntity,
  EncryptionKeyEntity,
  TransactionEntity,
  AccountEntity,
  DebtEntity,
  DebtTransactionEntity,
  MeterReadingEntity,
  CategoryEntity,
  MeterObjectEntity,
  MeterResourceEntity,
  MeterReadingRecord,
  TariffEntity,
  SubscriptionEntity,
} from '../core/services/finpocket-db.service';
import { CloudProvider } from './cloud-provider';
import { SyncQueue } from './sync.queue';
import { CurrencyService, Currency } from '../core/services/currency.service';
import { OperationAccountsService, OperationAccount } from '../finance/services/operation-accounts.service';
import { ThemeService, FinpocketTheme } from '../core/services/theme.service';
import { SyncSettingsService } from './services/sync-settings.service';

export interface BackupData {
  version: string;
  timestamp: string;
  theme?: FinpocketTheme;
  defaultCurrencyId?: string;
  currencies?: Currency[];
  operationAccounts?: OperationAccount[];
  data: {
    transactions: TransactionEntity[];
    accounts: AccountEntity[];
    debts: DebtEntity[];
    debtTransactions: DebtTransactionEntity[];
    meters: MeterReadingEntity[];
    categories: CategoryEntity[];
    meterObjects?: MeterObjectEntity[];
    meterResources?: MeterResourceEntity[];
    meterReadings?: MeterReadingRecord[];
    tariffs?: TariffEntity[];
    subscriptions?: SubscriptionEntity[];
  };
}

export interface EncryptedBackup {
  version: string;
  iv: string;
  salt: string;
  data: string; // base64-encoded encrypted data
}

const BACKUP_KEY_NAME = 'backup-encryption-key';
const PBKDF2_ITERATIONS = 100000;
const PASSPHRASE_PBKDF2_ITERATIONS = 250000;

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly db = inject(FinPocketDB);
  private readonly syncQueue = inject(SyncQueue);
  private readonly currencyService = inject(CurrencyService);
  private readonly accountsService = inject(OperationAccountsService);
  private readonly themeService = inject(ThemeService);
  private readonly settings = inject(SyncSettingsService);

  /**
   * Exports all data as an encrypted backup.
   * @param masterPassphrase The master passphrase to encrypt the backup
   * @returns Encrypted backup as a Blob
   */
  async exportBackup(masterPassphrase: string): Promise<Blob> {
    const currencySnapshot = this.currencyService.getSnapshot();
    const accountsSnapshot = this.accountsService.getSnapshot();

    // Gather all data
    const data: BackupData = {
      version: '1.2', // Bumped version
      timestamp: new Date().toISOString(),
      theme: this.themeService.theme(),
      defaultCurrencyId: currencySnapshot.defaultCurrencyId,
      currencies: currencySnapshot.currencies,
      operationAccounts: accountsSnapshot.accounts,
      data: {
        transactions: await this.db.transactions.toArray(),
        accounts: await this.db.accounts.toArray(),
        debts: await this.db.debts.toArray(),
        debtTransactions: await this.db.debtTransactions.toArray(),
        meters: await this.db.meters.toArray(),
        categories: await this.db.categories.toArray(),
        meterObjects: await this.db.meterObjects.toArray(),
        meterResources: await this.db.meterResources.toArray(),
        meterReadings: await this.db.meterReadings.toArray(),
        tariffs: await this.db.tariffs.toArray(),
        subscriptions: await this.db.subscriptions.toArray(),
      },
    };

    const plaintext = JSON.stringify(data);
    const encrypted = await this.encryptData(plaintext, masterPassphrase);

    const blob = new Blob([JSON.stringify(encrypted)], {
      type: 'application/json',
    });

    // Store backup metadata
    await this.db.backups.add({
      createdAt: new Date().toISOString(),
      size: blob.size,
      checksum: await this.computeChecksum(plaintext),
      payload: encrypted,
    });

    return blob;
  }

  /**
   * Imports data from an encrypted backup.
   * @param blob The encrypted backup blob
   * @param masterPassphrase The master passphrase to decrypt the backup
   */
  async importBackup(blob: Blob, masterPassphrase: string): Promise<void> {
    const text = await blob.text();
    const encrypted: EncryptedBackup = JSON.parse(text);

    const plaintext = await this.decryptData(encrypted, masterPassphrase);
    const data: BackupData = JSON.parse(plaintext);

    // Restore Settings (currencies, accounts, theme)
    if (data.currencies) {
      this.currencyService.restoreSnapshot({
        currencies: data.currencies,
        defaultCurrencyId: data.defaultCurrencyId || 'UAH'
      });
    }

    if (data.operationAccounts) {
      this.accountsService.restoreSnapshot({
        accounts: data.operationAccounts
      });
    }

    if (data.theme) {
      this.themeService.setTheme(data.theme);
    }

    // Clear existing data
    await this.db.transaction('rw', this.db.tables, async () => {
      await this.db.transactions.clear();
      await this.db.accounts.clear();
      await this.db.debts.clear();
      await this.db.debtTransactions.clear();
      await this.db.meters.clear();
      await this.db.categories.clear();
      await this.db.meterObjects.clear();
      await this.db.meterResources.clear();
      await this.db.meterReadings.clear();
      await this.db.tariffs.clear();
      await this.db.subscriptions.clear();

      // Import data
      await this.db.transactions.bulkAdd(data.data.transactions);
      await this.db.accounts.bulkAdd(data.data.accounts);
      await this.db.debts.bulkAdd(data.data.debts);
      await this.db.debtTransactions.bulkAdd(data.data.debtTransactions);
      await this.db.meters.bulkAdd(data.data.meters);
      await this.db.categories.bulkAdd(data.data.categories);

      if (data.data.meterObjects) await this.db.meterObjects.bulkAdd(data.data.meterObjects);
      if (data.data.meterResources) await this.db.meterResources.bulkAdd(data.data.meterResources);
      if (data.data.meterReadings) await this.db.meterReadings.bulkAdd(data.data.meterReadings);
      if (data.data.tariffs) await this.db.tariffs.bulkAdd(data.data.tariffs);
      if (data.data.subscriptions) await this.db.subscriptions.bulkAdd(data.data.subscriptions);
    });
  }

  /**
   * Performs two-way sync with a cloud provider.
   * @param provider The cloud provider to sync with
   * @param masterPassphrase The master passphrase for encryption
   * @param direction The sync direction
   */
  async twoWaySync(
    provider: CloudProvider,
    masterPassphrase: string,
    direction: 'upload' | 'download' | 'two-way'
  ): Promise<void> {
    const isAuthenticated = await provider.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('Provider not authenticated');
    }

    await provider.ensureAppFolder();

    if (direction === 'upload' || direction === 'two-way') {
      // Upload local changes
      const backup = await this.exportBackup(masterPassphrase);
      const name = `backup-${new Date().toISOString()}.finpocket.json.enc`;
      await provider.uploadBackup(name, backup);

      // Rotation
      await this.cleanupOldBackups(provider);
    }

    if (direction === 'download' || direction === 'two-way') {
      // Download and merge remote changes
      const backups = await provider.listBackups();
      if (backups.length > 0) {
        // Get the most recent backup
        const latest = backups.sort((a, b) => b.modified - a.modified)[0];
        const blob = await provider.downloadBackup(latest.id);
        await this.importBackup(blob, masterPassphrase);
      }
    }
  }

  /**
   * Queues a change for synchronization.
   * @param entityType The type of entity
   * @param entityId The entity ID
   * @param action The action performed
   * @param payload The entity data
   */
  async queueChange(
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    payload: unknown
  ): Promise<void> {
    await this.syncQueue.append({
      entityType,
      entityId,
      action,
      payload,
    });
  }

  /**
   * Encrypts data using AES-GCM with a key derived from the master passphrase.
   */
  private async encryptData(
    plaintext: string,
    masterPassphrase: string
  ): Promise<EncryptedBackup> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(masterPassphrase, salt);
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return {
      version: '1.0',
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt),
      data: this.arrayBufferToBase64(encrypted),
    };
  }

  /**
   * Decrypts data using AES-GCM with a key derived from the master passphrase.
   */
  private async decryptData(
    encrypted: EncryptedBackup,
    masterPassphrase: string
  ): Promise<string> {
    const salt = this.base64ToArrayBuffer(encrypted.salt);
    const iv = this.base64ToArrayBuffer(encrypted.iv);
    const data = this.base64ToArrayBuffer(encrypted.data);

    const key = await this.deriveKey(masterPassphrase, new Uint8Array(salt));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Derives an AES-GCM key from a passphrase using PBKDF2.
   */
  private async deriveKey(
    passphrase: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passphraseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derives an AES-GCM key from a textual passphrase using PBKDF2 with 250k iterations.
   */
  async deriveKeyFromPassphrase(pass: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pass),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: PASSPHRASE_PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts arbitrary JSON serializable object into a Blob payload.
   */
  async encryptJson(obj: any, key: CryptoKey): Promise<Blob> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(obj));

    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

    const payload = {
      ver: 1,
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encrypted),
    };

    return new Blob([JSON.stringify(payload)], { type: 'application/json' });
  }

  /**
   * Decrypts a Blob produced by {@link encryptJson} back to its original object.
   */
  async decryptJson(blob: Blob, key: CryptoKey): Promise<any> {
    const text = await blob.text();
    const payload = JSON.parse(text) as { ver: number; iv: string; data: string };

    if (payload?.ver !== 1 || !payload.iv || !payload.data) {
      throw new Error('Неподдерживаемый формат резервной копии');
    }

    const iv = new Uint8Array(this.base64ToArrayBuffer(payload.iv));
    const ciphertext = this.base64ToArrayBuffer(payload.data);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    const decoder = new TextDecoder();
    const decoded = decoder.decode(decrypted);

    return JSON.parse(decoded);
  }

  /**
   * Stores an encrypted encryption key in the database.
   */
  private async storeEncryptionKey(
    keyName: string,
    key: CryptoKey,
    masterPassphrase: string
  ): Promise<void> {
    const exported = await crypto.subtle.exportKey('raw', key);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const masterKey = await this.deriveKey(masterPassphrase, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      exported
    );

    const entity: EncryptionKeyEntity = {
      keyName,
      encryptedKey: this.arrayBufferToBase64(encrypted),
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv),
      createdAt: new Date().toISOString(),
    };

    // Remove existing key with same name
    const existing = await this.db.encryptionKeys
      .where('keyName')
      .equals(keyName)
      .first();
    if (existing?.id) {
      await this.db.encryptionKeys.delete(existing.id);
    }

    await this.db.encryptionKeys.add(entity);
  }

  /**
   * Retrieves and decrypts an encryption key from the database.
   */
  private async retrieveEncryptionKey(
    keyName: string,
    masterPassphrase: string
  ): Promise<CryptoKey | null> {
    const entity = await this.db.encryptionKeys
      .where('keyName')
      .equals(keyName)
      .first();

    if (!entity) {
      return null;
    }

    const salt = this.base64ToArrayBuffer(entity.salt);
    const iv = this.base64ToArrayBuffer(entity.iv);
    const encryptedKey = this.base64ToArrayBuffer(entity.encryptedKey);

    const masterKey = await this.deriveKey(
      masterPassphrase,
      new Uint8Array(salt)
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      masterKey,
      encryptedKey
    );

    return crypto.subtle.importKey('raw', decrypted, 'AES-GCM', true, [
      'encrypt',
      'decrypt',
    ]);
  }

  /**
   * Computes a SHA-256 checksum of the data.
   */
  private async computeChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return this.arrayBufferToBase64(hash);
  }

  /**
   * Converts an ArrayBuffer to a base64 string.
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts a base64 string to an ArrayBuffer.
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Removes remote backups older than retention period set in settings.
   */
  private async cleanupOldBackups(provider: CloudProvider): Promise<void> {
    const retentionDays = this.settings.getRetentionDays();
    if (retentionDays <= 0) return; // 0 = infinite retention

    try {
      const backups = await provider.listBackups();
      if (backups.length <= 1) return; // Keep at least the latest one

      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      const toDelete = backups.filter(b => {
        const age = now - b.modified;
        return age > retentionMs;
      });

      if (toDelete.length > 0) {
        console.log(`[SyncService] Cleaning up ${toDelete.length} old backups...`);
        for (const b of toDelete) {
          try {
            await provider.deleteBackup(b.id);
          } catch (e) {
            console.warn(`[SyncService] Failed to delete backup ${b.id}`, e);
          }
        }
      }
    } catch (error) {
      console.error('[SyncService] Backup cleanup failed', error);
    }
  }
}
