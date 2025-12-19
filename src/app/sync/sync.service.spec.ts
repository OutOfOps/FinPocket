import { TestBed } from '@angular/core/testing';
import { SyncService } from './sync.service';
import { FinPocketDB } from '../core/services/finpocket-db.service';
import { SyncQueue } from './sync.queue';
import { CurrencyService } from '../core/services/currency.service';
import { OperationAccountsService } from '../finance/services/operation-accounts.service';
import { ThemeService } from '../core/services/theme.service';

describe('SyncService encryption helpers', () => {
  let service: SyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SyncService,
        { provide: FinPocketDB, useValue: {} },
        { provide: SyncQueue, useValue: {} },
        {
          provide: CurrencyService,
          useValue: {
            getSnapshot: () => ({ currencies: [], defaultCurrencyId: 'UAH' }),
            restoreSnapshot: () => undefined
          }
        },
        {
          provide: OperationAccountsService,
          useValue: {
            getSnapshot: () => ({ accounts: [] }),
            restoreSnapshot: () => undefined
          }
        },
        {
          provide: ThemeService,
          useValue: { theme: () => 'light', setTheme: () => undefined }
        }
      ]
    });

    service = TestBed.inject(SyncService);
  });

  it('should encrypt and decrypt JSON payloads with derived key', async () => {
    const salt = new Uint8Array(16);
    const key = await service.deriveKeyFromPassphrase('top-secret', salt);
    const payload = { id: 42, title: 'FinPocket', nested: { ok: true }, items: [1, 2, 3] };

    const blob = await service.encryptJson(payload, key);
    const serialized = JSON.parse(await blob.text());

    expect(serialized.ver).toBe(1);
    expect(serialized.iv).toBeTruthy();
    expect(serialized.data).toBeTruthy();

    const decrypted = await service.decryptJson(blob, key);

    expect(decrypted).toEqual(payload);
  });

  it('should reject tampered payloads', async () => {
    const key = await service.deriveKeyFromPassphrase('test', new Uint8Array(16));
    const blob = await service.encryptJson({ foo: 'bar' }, key);
    const tamperedPayload = JSON.parse(await blob.text());

    tamperedPayload.data = tamperedPayload.data.slice(0, -2) + 'AA';
    const tamperedBlob = new Blob([JSON.stringify(tamperedPayload)], { type: 'application/json' });

    await expectAsync(service.decryptJson(tamperedBlob, key)).toBeRejected();
  });
});
