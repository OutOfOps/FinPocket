import { Component } from '@angular/core';

interface BackupHistoryEntry {
  id: string;
  createdAt: string;
  size: string;
  provider: string;
}

@Component({
  selector: 'app-sync-list',
  templateUrl: './sync-list.component.html',
  styleUrls: ['./sync-list.component.scss'],
})
export class SyncListComponent {
  readonly backups: BackupHistoryEntry[] = [
    { id: 'BKP-001', createdAt: '2024-03-01T08:30:00Z', size: '12 MB', provider: 'Google Drive' },
    { id: 'BKP-002', createdAt: '2024-03-05T21:00:00Z', size: '13 MB', provider: 'Dropbox' },
    { id: 'BKP-003', createdAt: '2024-03-10T10:15:00Z', size: '12.5 MB', provider: 'iCloud' },
  ];
}
