import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  GDriveAuthDB,
  GDriveTokenRecord,
  TOKEN_ENTRY_ID,
  TOKEN_URL,
  buildAuthContextKey,
} from '../../gdrive.provider';

type AuthStatus = 'pending' | 'success' | 'error';

interface StoredAuthContext {
  verifier: string;
  redirectUri: string;
  clientId: string;
  createdAt: number;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  expires_in: number;
}

@Component({
  selector: 'app-auth-callback',
  standalone: false,
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.scss'],
})
export class AuthCallbackComponent implements OnInit, OnDestroy {
  status: AuthStatus = 'pending';
  message = 'Завершаем авторизацию Google Drive...';

  private readonly route: ActivatedRoute;
  private readonly db = new GDriveAuthDB();

  constructor(route: ActivatedRoute) {
    this.route = route;
  }

  ngOnInit(): void {
    void this.handleCallback();
  }

  ngOnDestroy(): void {
    this.db.close();
  }

  private async handleCallback(): Promise<void> {
    const queryParams = this.route.snapshot.queryParamMap;
    const code = queryParams.get('code');
    const state = queryParams.get('state');
    const error = queryParams.get('error');

    if (!state) {
      this.fail('Ответ авторизации не содержит параметр state. Попробуйте снова.');
      return;
    }

    if (error) {
      this.notifyParent(state, 'error', `Авторизация отменена: ${error}`);
      this.fail('Авторизация Google Drive отменена или отклонена.');
      return;
    }

    if (!code) {
      this.notifyParent(state, 'error', 'Код авторизации отсутствует в ответе Google.');
      this.fail('Ответ Google не содержит кода авторизации.');
      return;
    }

    const context = this.restoreContext(state);
    if (!context) {
      this.notifyParent(state, 'error', 'Не удалось найти сохранённые параметры авторизации.');
      this.fail('Состояние авторизации не найдено. Запустите вход заново.');
      return;
    }

    try {
      const tokenResponse = await this.exchangeCodeForTokens(code, context);
      await this.persistTokens(tokenResponse);
      this.notifyParent(state, 'success');
      this.succeed('Авторизация завершена! Это окно можно закрыть.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка авторизации.';
      this.notifyParent(state, 'error', message);
      this.fail(message);
    }
  }

  private restoreContext(state: string): StoredAuthContext | null {
    try {
      const stored = window.localStorage.getItem(buildAuthContextKey(state));
      if (!stored) {
        return null;
      }

      window.localStorage.removeItem(buildAuthContextKey(state));
      const parsed = JSON.parse(stored) as StoredAuthContext | null;
      if (!parsed || !parsed.verifier || !parsed.clientId) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('[GDrive] Failed to restore auth context', error);
      return null;
    }
  }

  private async exchangeCodeForTokens(
    code: string,
    context: StoredAuthContext
  ): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams();
    params.set('client_id', context.clientId);
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('code_verifier', context.verifier);
    params.set('redirect_uri', context.redirectUri ?? `${window.location.origin}/#/auth/callback/gdrive`);

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(
        details
          ? `Не удалось обменять код на токен Google Drive: ${details}`
          : 'Не удалось обменять код на токен Google Drive.'
      );
    }

    return response.json();
  }

  private async persistTokens(response: GoogleTokenResponse): Promise<void> {
    const record: GDriveTokenRecord = {
      id: TOKEN_ENTRY_ID,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: this.computeExpiry(response.expires_in),
      scope: response.scope,
      tokenType: response.token_type,
    };

    await this.db.tokens.put(record);
  }

  private computeExpiry(expiresIn: number | undefined): number | undefined {
    if (!expiresIn) {
      return undefined;
    }

    return Date.now() + expiresIn * 1000;
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

  closeWindow(): void {
    try {
      window.close();
    } catch {
      // noop
    }
  }
}
