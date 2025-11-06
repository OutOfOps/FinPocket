import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedModule } from '../../../shared/shared-module';
import { SyncSettingsService } from '../../services/sync-settings.service';
import { SyncProviderRegistryService } from '../../services/sync-provider-registry.service';

interface SyncProviderOption {
  id: 'gdrive';
  title: string;
  description: string;
  requiresClientId: boolean;
}

@Component({
  selector: 'app-sync-edit',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './sync-edit.component.html',
  styleUrls: ['./sync-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncEditComponent {
  private readonly settings = inject(SyncSettingsService);
  private readonly registry = inject(SyncProviderRegistryService);
  private readonly snackBar = inject(MatSnackBar);

  readonly providers: SyncProviderOption[] = [
    {
      id: 'gdrive',
      title: 'Google Drive',
      description:
        'Используйте собственный OAuth 2.0 Client ID для доступа к файлам приложения в Google Drive.',
      requiresClientId: true,
    },
  ];

  selectedProvider: SyncProviderOption['id'] = this.providers[0].id;
  encryptionEnabled = this.settings.getEncryptionEnabled();
  gdriveClientId = this.settings.getGoogleDriveClientId() ?? '';

  save(): void {
    if (this.selectedProvider === 'gdrive') {
      const trimmed = this.gdriveClientId.trim();
      this.settings.setGoogleDriveClientId(trimmed.length ? trimmed : null);
      this.registry.invalidate('gdrive');
    }

    this.settings.setEncryptionEnabled(this.encryptionEnabled);

    this.snackBar.open('Настройки синхронизации сохранены.', 'OK', {
      duration: 4000,
    });
  }
}
