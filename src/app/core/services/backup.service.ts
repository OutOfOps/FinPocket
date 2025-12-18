import { Injectable, inject } from '@angular/core';
import { DataTransferService } from '../../settings/services/data-transfer.service';

@Injectable({ providedIn: 'root' })
export class BackupService {
    private readonly transferService = inject(DataTransferService);

    async exportBackup(): Promise<void> {
        const snapshot = await this.transferService.buildSnapshot();
        const json = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `finpocket-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    async importBackup(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    await this.transferService.importFromJson(content);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
}
