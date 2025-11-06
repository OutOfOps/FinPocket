import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharedModule } from '../../../shared/shared-module';
import { SyncSettingsService } from '../../services/sync-settings.service';
import { SyncProviderRegistryService } from '../../services/sync-provider-registry.service';
import { GDRIVE_CLIENT_ID_PATTERN } from '../../gdrive.provider';

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
  readonly gdriveClientIdPattern = GDRIVE_CLIENT_ID_PATTERN;
  readonly gdriveClientIdPatternSource = GDRIVE_CLIENT_ID_PATTERN.source.replace(/^\^|\$$/g, '');

  save(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.snackBar.open('Исправьте ошибки в настройках и попробуйте ещё раз.', 'OK', {
        duration: 5000,
      });
      return;
    }

    if (this.selectedProvider === 'gdrive') {
      const trimmed = this.gdriveClientId.trim();
      if (trimmed.length && !this.gdriveClientIdPattern.test(trimmed)) {
        this.snackBar.open('Client ID Google Drive имеет неверный формат.', 'OK', {
          duration: 5000,
        });
        return;
      }
      this.settings.setGoogleDriveClientId(trimmed.length ? trimmed : null);
      this.registry.invalidate('gdrive');
    }

    this.settings.setEncryptionEnabled(this.encryptionEnabled);

    this.snackBar.open('Настройки синхронизации сохранены.', 'OK', {
      duration: 4000,
    });
  }
}
