import { Injectable } from '@angular/core';
import {
  GDriveAuthDB,
  GDriveTokenRecord,
  TOKEN_ENTRY_ID,
  TOKEN_URL,
  buildAuthContextKey,
} from '../gdrive.provider';
import { SyncSettingsService } from './sync-settings.service';
import { generateCodeChallenge, generateCodeVerifier } from '../pkce';

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

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const PROD_REDIRECT_URI = 'https://outofops.github.io/FinPocket/auth/callback/gdrive';
const LOCAL_REDIRECT_URI = 'http://localhost:4200/auth/callback/gdrive';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  constructor(private readonly settings: SyncSettingsService) {}

  async startAuthFlow(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('OAuth 2.0 доступен только в браузере.');
    }

    const clientId = this.settings.getGoogleDriveClientId();
    if (!clientId) {
      throw new Error(
        'Client ID Google Drive не настроен. Укажите его в настройках синхронизации.'
      );
    }

    const verifier = await generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = this.generateState();
    const redirectUri = this.resolveRedirectUri();

    this.persistAuthContext(state, {
      verifier,
      redirectUri,
      clientId,
      createdAt: Date.now(),
    });

    const authUrl = new URL(AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', DEFAULT_SCOPE);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'consent');

    window.location.href = authUrl.toString();
  }

  async finishGoogleAuth(code: string, state: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('OAuth 2.0 завершение доступно только в браузере.');
    }

    const context = this.restoreAuthContext(state);
    if (!context) {
      throw new Error('Состояние авторизации не найдено. Повторите вход.');
    }

    const params = new URLSearchParams();
    params.set('client_id', context.clientId);
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('code_verifier', context.verifier);
    params.set('redirect_uri', context.redirectUri);

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

    const payload = (await response.json()) as GoogleTokenResponse;
    const db = new GDriveAuthDB();

    try {
      const record: GDriveTokenRecord = {
        id: TOKEN_ENTRY_ID,
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: this.computeExpiry(payload.expires_in),
        scope: payload.scope,
        tokenType: payload.token_type,
      };

      await db.tokens.put(record);
    } finally {
      db.close();
      this.clearAuthContext(state);
    }
  }

  private resolveRedirectUri(): string {
    if (typeof window === 'undefined') {
      return PROD_REDIRECT_URI;
    }

    const origin = window.location.origin;
    return origin.includes('localhost') ? LOCAL_REDIRECT_URI : PROD_REDIRECT_URI;
  }

  private generateState(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return Math.random().toString(36).slice(2, 18);
  }

  private persistAuthContext(state: string, context: StoredAuthContext): void {
    try {
      window.localStorage.setItem(buildAuthContextKey(state), JSON.stringify(context));
    } catch (error) {
      console.warn('[GDrive] Failed to persist auth context', error);
    }
  }

  private restoreAuthContext(state: string): StoredAuthContext | null {
    try {
      const stored = window.localStorage.getItem(buildAuthContextKey(state));
      if (!stored) {
        return null;
      }

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

  private clearAuthContext(state: string): void {
    try {
      window.localStorage.removeItem(buildAuthContextKey(state));
    } catch (error) {
      console.warn('[GDrive] Failed to clear auth context', error);
    }
  }

  private computeExpiry(expiresIn: number | undefined): number | undefined {
    if (!expiresIn) {
      return undefined;
    }

    return Date.now() + expiresIn * 1000;
  }
}
