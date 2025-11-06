import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import type { Subscription as DexieSubscription } from 'dexie';
import { liveQuery } from 'dexie';
import { SharedModule } from '../../../shared/shared-module';
import { FinPocketDB, BackupEntity } from '../../../core/services/finpocket-db.service';
import { formatBytes } from '../../../shared/utils/format-bytes';

interface BackupHistoryEntry {
  id?: number;
  createdAt: string;
  sizeLabel: string;
  checksum: string;
}

@Component({
  selector: 'app-sync-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sync-list.component.html',
  styleUrls: ['./sync-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncListComponent implements OnDestroy {
  backups: BackupHistoryEntry[] = [];
  isLoading = true;
  error?: string;

  private readonly db = inject(FinPocketDB);
  private subscription?: DexieSubscription;

  constructor() {
    this.subscription = liveQuery(() => this.db.backups.orderBy('createdAt').reverse().toArray())
      .subscribe({
        next: (items) => {
          this.backups = items.map((item) => this.mapEntity(item));
          this.isLoading = false;
          this.error = undefined;
        },
        error: (err) => {
          console.error('[SyncList] Failed to load backups', err);
          this.error = err instanceof Error ? err.message : 'Не удалось загрузить резервные копии';
          this.isLoading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  trackByBackup(_index: number, item: BackupHistoryEntry): number | undefined {
    return item.id;
  }

  private mapEntity(entity: BackupEntity): BackupHistoryEntry {
    return {
      id: entity.id,
      createdAt: entity.createdAt,
      sizeLabel: formatBytes(entity.size),
      checksum: entity.checksum,
    };
  }
}
