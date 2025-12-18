import { Component, inject } from '@angular/core';
import { GoogleAuthService } from '../services/google-auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-sync',
  standalone: false,
  templateUrl: './sync.html',
  styleUrl: './sync.scss',
})
export class Sync {
  protected readonly googleAuth = inject(GoogleAuthService);
  private readonly snack = inject(MatSnackBar);

  protected async startGoogleAuth(): Promise<void> {
    try {
      await this.googleAuth.startAuthFlow();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось начать авторизацию';
      this.snack.open(message, 'Закрыть', { duration: 5000 });
    }
  }
}
