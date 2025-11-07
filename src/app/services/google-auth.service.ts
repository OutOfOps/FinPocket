import { Injectable } from '@angular/core';
import { GDRIVE_CLIENT_ID_PATTERN, resolveGDriveRedirectUri } from '../sync/gdrive.provider';
import { SyncSettingsService } from '../sync/services/sync-settings.service';

interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

const CODE_VERIFIER_KEY = 'gdrive_code_verifier';
const TOKEN_STORAGE_KEY = 'gdrive_tokens';
const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const CODE_VERIFIER_TTL_MS = 10 * 60 * 1000;

interface StoredCodeVerifierRecord {
  verifier: string;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  constructor(private readonly settings: SyncSettingsService) {}

  private readonly scope = 'https://www.googleapis.com/auth/drive.file';
  private readonly tokenEndpoint = 'https://oauth2.googleapis.com/token';

  async startAuthFlow(): Promise<void> {
    if (typeof window === 'undefined' || typeof window.crypto === 'undefined') {
      throw new Error('OAuth 2.0 доступен только в браузере.');
    }

    const clientId = this.getClientIdOrThrow();
    const redirectUri = this.getRedirectUri();
    const verifier = this.generateCodeVerifier();
    this.storeCodeVerifier(verifier);
    const challenge = await this.generateCodeChallenge(verifier);
    const state = this.generateState();

    const authUrl = new URL(AUTHORIZATION_ENDPOINT);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  }

  private generateCodeVerifier(): string {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
      throw new Error('Web Crypto API недоступен');
    }

    const randomBytes = new Uint8Array(64);
    cryptoApi.getRandomValues(randomBytes);
    return this.base64UrlEncode(randomBytes);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi || !cryptoApi.subtle || typeof cryptoApi.subtle.digest !== 'function') {
      throw new Error('Web Crypto API недоступен');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await cryptoApi.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }


  async exchangeCodeForToken(code: string): Promise<void> {
    const verifier = this.restoreCodeVerifier();
    if (!verifier) {
      throw new Error('Код подтверждения PKCE отсутствует. Повторите авторизацию.');
    }

    const clientId = this.getClientIdOrThrow();
    const redirectUri = this.getRedirectUri();

    const payload = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    });

    console.group('%c[OAuth] Обмен кода на токен', 'color:#03A9F4');
    console.log('client_id:', clientId);
    console.log('redirect_uri:', redirectUri);
    console.log('code_verifier (len):', verifier.length);
    console.log('payload:', payload.toString());
    console.groupEnd();

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });

    const raw = await response.text();
    console.log('%c[OAuth] Ответ Google:', 'color:#FFC107', raw);

    if (!response.ok) {
      // выведем статус, чтобы точно понимать
      console.error('Response status:', response.status, response.statusText);
      let errorHint = '';
      try {
        const errJson = JSON.parse(raw);
        errorHint = `${errJson.error}: ${errJson.error_description ?? ''}`;
      } catch {
        errorHint = 'Ответ не JSON, возможно 400 Bad Request из-за неправильного тела запроса.';
      }
      throw new Error(`Ошибка обмена кода на токен Google Drive: ${errorHint}`);
    }

    let data: TokenResponse;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Ошибка парсинга ответа Google OAuth API.');
    }

    if (!data.access_token || !data.expires_in) {
      throw new Error('Ответ Google не содержит access_token или expires_in.');
    }

    console.log('%c[OAuth] Токен успешно получен!', 'color:#4CAF50', data);
    this.saveTokens(data);
  }


  getAccessToken(): string | null {
    const tokens = this.loadTokens();
    if (!tokens) {
      return null;
    }

    if (Date.now() >= tokens.expires_at) {
      return null;
    }

    return tokens.access_token;
  }

  async refreshAccessToken(): Promise<string | null> {
    const existing = this.loadTokens();
    if (!existing?.refresh_token) {
      return null;
    }

    let clientId: string;
    try {
      clientId = this.getClientIdOrThrow();
    } catch (error) {
      console.error('[GDrive] refresh token aborted: client id unavailable', error);
      this.logout();
      return null;
    }

    const payload = new URLSearchParams();
    payload.set('client_id', clientId);
    payload.set('grant_type', 'refresh_token');
    payload.set('refresh_token', existing.refresh_token);

    try {
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(
          details
            ? `Не удалось обновить токен Google Drive: ${details}`
            : 'Не удалось обновить токен Google Drive.'
        );
      }

      const data = (await response.json()) as TokenResponse;
      if (!data.access_token || !data.expires_in) {
        throw new Error('Ответ обновления токена Google Drive не содержит access_token.');
      }

      if (!data.refresh_token) {
        data.refresh_token = existing.refresh_token;
      }

      this.saveTokens(data);
      return data.access_token;
    } catch (error) {
      console.error('[GDrive] refresh token failed', error);
      this.logout();
      return null;
    }
  }

  logout(): void {
    this.clearCodeVerifier();
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  private saveTokens(data: TokenResponse): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const existing = this.loadTokens();
    const expiresAt = Date.now() + data.expires_in * 1000;
    const record: StoredTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? existing?.refresh_token,
      expires_at: expiresAt,
    };

    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(record));
  }

  private loadTokens(): StoredTokens | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredTokens;
    } catch (error) {
      console.warn('[GDrive] Failed to parse stored tokens', error);
      return null;
    }
  }

  async ensureTokenValid(): Promise<string | null> {
    const tokens = this.loadTokens();
    if (!tokens) {
      return null;
    }

    if (Date.now() > tokens.expires_at - 60_000) {
      return await this.refreshAccessToken();
    }

    return tokens.access_token;
  }

  private base64UrlEncode(data: Uint8Array): string {
    let binary = '';
    data.forEach((value) => {
      binary += String.fromCharCode(value);
    });

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private restoreCodeVerifier(): string | null {
    let record: StoredCodeVerifierRecord | null = null;
    try {
      const raw = localStorage.getItem(CODE_VERIFIER_KEY);
      if (raw) record = JSON.parse(raw);
    } catch (error) {
      console.warn('[GDrive] Failed to parse PKCE code verifier', error);
    }

    if (!record) return null;

    // TTL — 10 минут
    if (Date.now() - record.createdAt > CODE_VERIFIER_TTL_MS) {
      localStorage.removeItem(CODE_VERIFIER_KEY);
      return null;
    }

    // ⚠️ Не очищаем сразу — оставляем на случай повторного обмена
    return record.verifier;
  }

  private clearCodeVerifier(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(CODE_VERIFIER_KEY);
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CODE_VERIFIER_KEY);
    }
  }

  private generateState(): string {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
      return cryptoApi.randomUUID();
    }

    return Math.random().toString(36).slice(2, 18);
  }

  private readStoredCodeVerifier(): StoredCodeVerifierRecord | null {
    const storages: Array<Storage | undefined> = [
      typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
      typeof localStorage !== 'undefined' ? localStorage : undefined,
    ];

    for (const storage of storages) {
      if (!storage) {
        continue;
      }

      const raw = storage.getItem(CODE_VERIFIER_KEY);
      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as StoredCodeVerifierRecord | null;
        if (parsed && typeof parsed.verifier === 'string' && typeof parsed.createdAt === 'number') {
          return parsed;
        }
      } catch (error) {
        console.warn('[GDrive] Failed to parse stored PKCE code verifier', error);
      }
    }

    return null;
  }

  private storeCodeVerifier(verifier: string): void {
    const record: StoredCodeVerifierRecord = { verifier, createdAt: Date.now() };
    const payload = JSON.stringify(record);

    // 💡 Сохраняем в localStorage, чтобы переживал redirect на GitHub Pages
    try {
      localStorage.setItem(CODE_VERIFIER_KEY, payload);
    } catch (error) {
      console.warn('[GDrive] Failed to persist PKCE code verifier', error);
    }
  }

  private getClientIdOrThrow(): string {
    const clientId = this.settings.getGoogleDriveClientId();
    if (!clientId) {
      throw new Error(
        'Client ID Google Drive не настроен. Укажите значение из Google Cloud Console в настройках синхронизации.'
      );
    }

    if (!GDRIVE_CLIENT_ID_PATTERN.test(clientId)) {
      throw new Error(
        'Client ID Google Drive имеет неверный формат. Используйте идентификатор вида 12345-abc.apps.googleusercontent.com.'
      );
    }

    return clientId;
  }

  private getRedirectUri(): string {
    return resolveGDriveRedirectUri();
  }
}
