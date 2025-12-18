import Dexie, { Table } from 'dexie';
import { AuthState, CloudProvider } from './cloud-provider';
import { generateCodeChallenge, generateCodeVerifier } from './pkce';

export interface GDriveTokenRecord {
  id: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
  appFolderId?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

interface GoogleAboutResponse {
  user?: {
    permissionId?: string;
    displayName?: string;
    emailAddress?: string;
  };
}

export interface GDriveProviderOptions {
  clientId: string;
  clientSecret?: string;
}

export class GDriveAuthDB extends Dexie {
  declare tokens: Table<GDriveTokenRecord, string>;

  constructor() {
    super('auth.gdrive');
    this.version(1).stores({ tokens: '&id' });
  }
}

export const GDRIVE_CLIENT_ID_PATTERN = /^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/;

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_ABOUT_URL = 'https://www.googleapis.com/drive/v3/about?fields=user';
export const TOKEN_ENTRY_ID = 'tokens';
const DEFAULT_FOLDER_NAME = 'FinPocket';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export function resolveGDriveRedirectUri(): string {
  if (typeof window === 'undefined') {
    throw new Error('redirect_uri недоступен вне браузера');
  }

  const baseHref =
    typeof document !== 'undefined' && document.baseURI
      ? document.baseURI
      : `${window.location.origin}/`;

  return new URL('auth/callback/gdrive', baseHref).toString();
}

export class GDriveProvider implements CloudProvider {
  readonly id = 'gdrive' as const;
  readonly label = 'Google Drive';

  private readonly db = new GDriveAuthDB();
  private quotaToastVisible = false;
  private cachedRecord: GDriveTokenRecord | null = null;

  constructor(private readonly options: GDriveProviderOptions) { }

  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      console.warn('[GDrive] isAuthenticated check failed', error);
      return false;
    }
  }

  async getAuthState(): Promise<AuthState | null> {
    const record = await this.getTokenRecord();
    if (!record) {
      return null;
    }

    return {
      provider: 'gdrive',
      user: record.user,
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
      expiresAt: record.expiresAt,
    };
  }

  async login(): Promise<AuthState> {
    if (typeof window === 'undefined') {
      throw new Error('OAuth login is only available in browser environments');
    }

    const clientId = this.requireClientId();
    const verifier = await generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = this.generateState();
    const redirectUri = this.validateRedirectUri(this.buildRedirectUri());

    this.storeAuthContext(state, { verifier, redirectUri, clientId });

    const authUrl = new URL(AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', DEFAULT_SCOPE);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    const popup = window.open(
      authUrl.toString(),
      'gdrive-oauth',
      'popup=yes,width=600,height=700'
    );

    if (!popup) {
      throw new Error('Не удалось открыть окно авторизации Google');
    }

    try {
      await this.waitForAuthCompletion(popup, state);
    } finally {
      this.clearAuthContext(state);
    }

    const { record } = await this.getAccessToken();
    let finalRecord = record;

    if (!record.user) {
      try {
        const user = await this.fetchUserProfile(record.accessToken);
        if (user) {
          finalRecord = { ...record, user };
          await this.saveTokenRecord(finalRecord);
        }
      } catch (error) {
        console.warn('[GDrive] Failed to fetch user profile after login', error);
      }
    }

    return {
      provider: 'gdrive',
      user: finalRecord.user,
      accessToken: finalRecord.accessToken,
      refreshToken: finalRecord.refreshToken,
      expiresAt: finalRecord.expiresAt,
    };
  }

  async logout(): Promise<void> {
    await this.db.tokens.delete(TOKEN_ENTRY_ID);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gdrive_tokens');
    }
    this.cachedRecord = null;
  }

  async ensureAppFolder(): Promise<string> {
    const { token, record } = await this.getAccessToken();

    if (record.appFolderId) {
      return record.appFolderId;
    }

    const folderId = await this.findOrCreateAppFolder(token);
    const updated: GDriveTokenRecord = { ...record, appFolderId: folderId };
    await this.saveTokenRecord(updated);

    return folderId;
  }

  async listBackups(): Promise<Array<{ id: string; name: string; size: number; modified: number }>> {
    const folderId = await this.ensureAppFolder();
    const { token } = await this.getAccessToken();

    const url = new URL(DRIVE_FILES_URL);
    url.searchParams.set(
      'q',
      `('${folderId}' in parents) and trashed = false and name contains '.finpocket.json.enc'`
    );
    url.searchParams.set('orderBy', 'modifiedTime desc');
    url.searchParams.set('fields', 'files(id,name,size,modifiedTime)');
    url.searchParams.set('pageSize', '100');

    const response = await this.fetchWithAuth(url.toString(), token);
    if (!response.ok) {
      throw new Error('Не удалось получить список резервных копий Google Drive');
    }

    const data: { files?: Array<{ id: string; name: string; size?: string; modifiedTime?: string }> } =
      await response.json();

    return (
      data.files?.map((file) => ({
        id: file.id,
        name: file.name,
        size: Number(file.size ?? 0),
        modified: file.modifiedTime ? new Date(file.modifiedTime).getTime() : 0,
      })) ?? []
    );
  }

  async downloadBackup(id: string): Promise<Blob> {
    const { token } = await this.getAccessToken();
    const url = `${DRIVE_FILES_URL}/${encodeURIComponent(id)}?alt=media`;
    const response = await this.fetchWithAuth(url, token);
    if (!response.ok) {
      throw new Error('Не удалось скачать резервную копию Google Drive');
    }

    return response.blob();
  }

  async uploadBackup(
    name: string,
    data: Blob
  ): Promise<{ id: string; name: string; modified: number }> {
    const folderId = await this.ensureAppFolder();
    const { token } = await this.getAccessToken();

    const metadata = {
      name,
      parents: [folderId],
      mimeType: 'application/octet-stream',
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' })
    );
    formData.append('file', data, name);

    const response = await fetch(DRIVE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить резервную копию на Google Drive');
    }

    const file: { id: string; name: string; modifiedTime?: string } = await response.json();

    return {
      id: file.id,
      name: file.name,
      modified: file.modifiedTime ? new Date(file.modifiedTime).getTime() : Date.now(),
    };
  }

  async deleteBackup(id: string): Promise<void> {
    const { token } = await this.getAccessToken();
    const url = `${DRIVE_FILES_URL}/${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Не удалось удалить резервную копию Google Drive');
    }
  }

  private async getTokenRecord(): Promise<GDriveTokenRecord | null> {
    if (this.cachedRecord) {
      return this.cachedRecord;
    }

    let record = await this.db.tokens.get(TOKEN_ENTRY_ID);

    // Fallback to localStorage (GoogleAuthService storage)
    if (!record && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('gdrive_tokens');
      if (raw) {
        try {
          const stored = JSON.parse(raw);
          if (stored.access_token) {
            record = {
              id: TOKEN_ENTRY_ID,
              accessToken: stored.access_token,
              refreshToken: stored.refresh_token,
              expiresAt: stored.expires_at
            };
            // Sync back to indexedDB for next time
            await this.saveTokenRecord(record);
          }
        } catch { }
      }
    }

    this.cachedRecord = record ?? null;
    return this.cachedRecord;
  }

  private async saveTokenRecord(record: GDriveTokenRecord): Promise<void> {
    await this.db.tokens.put({ ...record, id: TOKEN_ENTRY_ID });
    this.cachedRecord = record;
  }

  private async getAccessToken(): Promise<{ token: string; record: GDriveTokenRecord }> {
    const record = await this.ensureToken();
    return { token: record.accessToken, record };
  }

  async ensureToken(): Promise<GDriveTokenRecord> {
    const record = await this.getTokenRecord();
    if (!record || !record.accessToken) {
      throw new Error('Google Drive не авторизован');
    }

    if (!record.expiresAt || Date.now() <= record.expiresAt - 60000) {
      return record;
    }

    if (!record.refreshToken) {
      await this.logout();
      throw new Error('Срок действия токена Google Drive истёк, требуется повторный вход');
    }

    const refreshed = await this.refreshAccessToken(record.refreshToken);
    if (!refreshed || !refreshed.access_token) {
      await this.logout();
      throw new Error('Не удалось обновить токен Google Drive, требуется повторная авторизация');
    }

    const updated: GDriveTokenRecord = {
      ...record,
      accessToken: refreshed.access_token,
      expiresAt: this.computeExpiry(refreshed.expires_in),
      scope: refreshed.scope ?? record.scope,
      tokenType: refreshed.token_type ?? record.tokenType,
    };

    if (refreshed.refresh_token) {
      updated.refreshToken = refreshed.refresh_token;
    }

    await this.saveTokenRecord(updated);
    return updated;
  }

  private async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse | null> {
    const params = new URLSearchParams();
    params.set('client_id', this.requireClientId());
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);

    const clientSecret = this.normalizeClientId(this.options.clientSecret);
    if (clientSecret) {
      params.set('client_secret', clientSecret);
    }

    return this.requestToken(params);
  }

  private async fetchUserProfile(accessToken: string): Promise<GDriveTokenRecord['user']> {
    const response = await fetch(DRIVE_ABOUT_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const data: GoogleAboutResponse = await response.json();
    if (!data.user) {
      return undefined;
    }

    return {
      id: data.user.permissionId ?? 'me',
      name: data.user.displayName,
      email: data.user.emailAddress,
    };
  }

  private async findOrCreateAppFolder(accessToken: string): Promise<string> {
    const existing = await this.findAppFolder(accessToken);
    if (existing) {
      return existing;
    }

    const response = await fetch(DRIVE_FILES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        name: DEFAULT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[GDrive] Create folder failed:', response.status, errorText);
      throw new Error(`Не удалось создать папку приложения в Google Drive: ${response.status} ${errorText}`);
    }

    const folder: { id: string } = await response.json();
    return folder.id;
  }

  private async findAppFolder(accessToken: string): Promise<string | null> {
    const url = new URL(DRIVE_FILES_URL);
    url.searchParams.set(
      'q',
      `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${DEFAULT_FOLDER_NAME}'`
    );
    url.searchParams.set('fields', 'files(id)');
    url.searchParams.set('pageSize', '1');

    const response = await this.fetchWithAuth(url.toString(), accessToken);
    if (!response.ok) {
      return null;
    }

    const data: { files?: Array<{ id: string }> } = await response.json();
    return data.files?.[0]?.id ?? null;
  }

  private fetchWithAuth(url: string, accessToken: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers ?? {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers });
  }

  private computeExpiry(expiresIn: number | undefined): number | undefined {
    if (!expiresIn) {
      return undefined;
    }

    return Date.now() + expiresIn * 1000;
  }

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private buildRedirectUri(): string {
    return resolveGDriveRedirectUri();
  }

  private requireClientId(): string {
    const clientId = this.normalizeClientId(this.options.clientId);
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

    this.options.clientId = clientId;

    return clientId;
  }

  private normalizeClientId(clientId: string | undefined): string {
    if (!clientId) {
      return '';
    }

    return clientId
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/\s+/g, '');
  }

  private validateRedirectUri(redirectUri: string): string {
    let parsed: URL;

    try {
      parsed = new URL(redirectUri);
    } catch {
      throw new Error(
        'Некорректный redirect_uri для авторизации Google Drive. Проверьте настройки приложения и скопируйте адрес перенаправления заново.'
      );
    }

    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }

    if (parsed.protocol === 'http:') {
      const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
      if (allowedHosts.has(parsed.hostname)) {
        return parsed.toString();
      }
    }

    throw new Error(
      'Адрес перенаправления Google Drive должен использовать HTTPS. Для локальной разработки допустим только http://localhost.'
    );
  }

  private waitForAuthCompletion(popup: Window, expectedState: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const messageHandler = (event: MessageEvent): void => {
        if (event.origin !== window.location.origin) {
          return;
        }

        const data = event.data as
          | {
            provider: string;
            state?: string;
            status?: 'success' | 'error';
            error?: string;
          }
          | undefined;

        if (!data || data.provider !== 'gdrive') {
          return;
        }

        if (data.state !== expectedState) {
          reject(new Error('Состояние OAuth не совпадает'));
          cleanup();
          return;
        }

        if (data.status !== 'success') {
          reject(new Error(data.error ?? 'Авторизация Google Drive не удалась'));
          cleanup();
          return;
        }

        resolve();
        cleanup();
      };

      const timer = window.setInterval(() => {
        if (popup.closed) {
          reject(new Error('Окно авторизации Google закрыто до завершения входа'));
          cleanup();
        }
      }, 500);

      const cleanup = (): void => {
        window.removeEventListener('message', messageHandler);
        window.clearInterval(timer);
      };

      window.addEventListener('message', messageHandler);
    });
  }

  private storeAuthContext(
    state: string,
    context: { verifier: string; redirectUri: string; clientId: string }
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const payload = {
        verifier: context.verifier,
        redirectUri: context.redirectUri,
        clientId: context.clientId,
        createdAt: Date.now(),
      } satisfies Record<string, unknown>;
      window.localStorage.setItem(this.buildAuthContextKey(state), JSON.stringify(payload));
    } catch (error) {
      console.warn('[GDrive] Failed to persist auth context', error);
    }
  }

  private clearAuthContext(state: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(this.buildAuthContextKey(state));
    } catch (error) {
      console.warn('[GDrive] Failed to clear auth context', error);
    }
  }

  private buildAuthContextKey(state: string): string {
    return buildAuthContextKey(state);
  }

  private async requestToken(params: URLSearchParams): Promise<GoogleTokenResponse | null> {
    const maxAttempts = 3;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      attempt += 1;

      try {
        const response = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (response.ok) {
          return response.json();
        }

        if (response.status === 403) {
          this.showQuotaExceededToast();
          return null;
        }

        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          if (attempt < maxAttempts) {
            await this.delay(delay);
            delay *= 2;
            continue;
          }
        }

        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Google Drive token request failed with status ${response.status}. ${errorText}`
        );
      } catch (error) {
        if (attempt >= maxAttempts) {
          throw error;
        }

        await this.delay(delay);
        delay *= 2;
      }
    }

    return null;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private showQuotaExceededToast(): void {
    if (typeof document === 'undefined') {
      console.warn(
        '[GDrive] Received quota exceeded response but cannot show toast outside browser context'
      );
      return;
    }

    if (this.quotaToastVisible) {
      return;
    }

    this.quotaToastVisible = true;

    const toast = document.createElement('div');
    toast.textContent =
      'Google Drive временно исчерпал квоту. Повторите попытку через несколько минут.';
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '24px';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(50, 50, 50, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    toast.style.zIndex = '10000';
    toast.style.fontSize = '14px';
    toast.style.fontFamily = 'Roboto, Arial, sans-serif';
    toast.style.maxWidth = '320px';
    toast.style.textAlign = 'center';
    toast.style.transition = 'opacity 300ms ease';
    toast.style.opacity = '1';

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
        this.quotaToastVisible = false;
      }, 300);
    }, 5000);
  }
}

export const AUTH_CONTEXT_PREFIX = 'gdrive:oauth:';

export function buildAuthContextKey(state: string): string {
  return `${AUTH_CONTEXT_PREFIX}${state}`;
}
