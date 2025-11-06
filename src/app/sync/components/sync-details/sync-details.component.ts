import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import type { Subscription as DexieSubscription } from 'dexie';
import { liveQuery } from 'dexie';
import { SharedModule } from '../../../shared/shared-module';
import { FinPocketDB } from '../../../core/services/finpocket-db.service';
import { formatBytes } from '../../../shared/utils/format-bytes';

interface LatestBackupDetails {
  id?: number;
  createdAt: string;
  sizeLabel: string;
  checksum: string;
}

interface IntegrityCheckItem {
  label: string;
  result: string;
}

@Component({
  selector: 'app-sync-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sync-details.component.html',
  styleUrls: ['./sync-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncDetailsComponent implements OnDestroy {
  latestBackup?: LatestBackupDetails;
  integrityChecks: IntegrityCheckItem[] = [];
  isLoading = true;
  error?: string;

  private readonly db = inject(FinPocketDB);
  private backupSubscription?: DexieSubscription;
  private integritySubscription?: DexieSubscription;

  constructor() {
    this.backupSubscription = liveQuery(() =>
      this.db.backups.orderBy('createdAt').reverse().limit(1).toArray()
    ).subscribe({
      next: (items) => {
        const [latest] = items;
        this.latestBackup = latest
          ? {
              id: latest.id,
              createdAt: latest.createdAt,
              sizeLabel: formatBytes(latest.size),
              checksum: latest.checksum,
            }
          : undefined;
        this.isLoading = false;
        this.error = undefined;
      },
      error: (err) => {
        console.error('[SyncDetails] Failed to load latest backup', err);
        this.error = err instanceof Error ? err.message : 'Не удалось загрузить данные';
        this.isLoading = false;
      },
    });

    this.integritySubscription = liveQuery(async () => ({
      transactions: await this.db.transactions.count(),
      accounts: await this.db.accounts.count(),
      debts: await this.db.debts.count(),
      meters: await this.db.meters.count(),
      categories: await this.db.categories.count(),
      backups: await this.db.backups.count(),
    })).subscribe({
      next: (counts) => {
        this.integrityChecks = [
          { label: 'Транзакции', result: `${counts.transactions} записей` },
          { label: 'Счета', result: `${counts.accounts} записей` },
          { label: 'Долги', result: `${counts.debts} записей` },
          { label: 'Показания счётчиков', result: `${counts.meters} записей` },
          { label: 'Категории', result: `${counts.categories} записей` },
          { label: 'Резервные копии', result: `${counts.backups} файлов` },
        ];
      },
      error: (err) => {
        console.error('[SyncDetails] Failed to compute integrity checks', err);
      },
    });
  }

  ngOnDestroy(): void {
    this.backupSubscription?.unsubscribe();
    this.integritySubscription?.unsubscribe();
  }
}
