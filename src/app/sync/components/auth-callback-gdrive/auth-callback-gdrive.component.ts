import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GoogleAuthService } from '../../services/google-auth.service';

type AuthStatus = 'pending' | 'success' | 'error';

@Component({
  selector: 'app-auth-callback-gdrive',
  standalone: false,
  templateUrl: './auth-callback-gdrive.component.html',
  styleUrls: ['./auth-callback-gdrive.component.scss'],
})
export class AuthCallbackGDriveComponent implements OnInit {
  status: AuthStatus = 'pending';
  message = 'Завершаем авторизацию Google Drive...';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly googleAuth: GoogleAuthService
  ) {}

  ngOnInit(): void {
    void this.handleCallback();
  }

  closeWindow(): void {
    try {
      window.close();
    } catch {
      // noop
    }
  }

  private async handleCallback(): Promise<void> {
    const queryParams = this.route.snapshot.queryParamMap;
    const code = queryParams.get('code');
    const state = queryParams.get('state');
    const error = queryParams.get('error');

    if (error) {
      if (state) {
        this.notifyParent(state, 'error', `Авторизация отменена: ${error}`);
      }
      this.fail(`Авторизация отменена: ${error}`);
      return;
    }

    if (!state) {
      this.fail('Ответ авторизации не содержит параметр state. Попробуйте снова.');
      return;
    }

    if (!code) {
      this.notifyParent(state, 'error', 'Код авторизации отсутствует в ответе Google.');
      this.fail('Ответ Google не содержит кода авторизации.');
      return;
    }

    try {
      await this.googleAuth.finishGoogleAuth(code, state);
      this.notifyParent(state, 'success');
      this.succeed('Авторизация завершена! Это окно можно закрыть.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка авторизации.';
      this.notifyParent(state, 'error', message);
      this.fail(message);
    }
  }

  private succeed(message: string): void {
    this.status = 'success';
    this.message = message;

    setTimeout(() => {
      this.closeWindow();
    }, 2000);
  }

  private fail(message: string): void {
    this.status = 'error';
    this.message = message;
  }

  private notifyParent(state: string, status: 'success' | 'error', error?: string): void {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          provider: 'gdrive',
          state,
          status,
          error,
        },
        window.location.origin
      );
    }
  }
}
