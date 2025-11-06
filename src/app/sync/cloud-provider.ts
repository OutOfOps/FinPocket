export interface AuthState {
  provider: 'gdrive' | 'onedrive' | 'dropbox';
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export type SyncDirection = 'upload' | 'download' | 'two-way';

export interface CloudProvider {
  readonly id: 'gdrive' | 'onedrive' | 'dropbox';
  readonly label: string;
  isAuthenticated(): Promise<boolean>;
  getAuthState(): Promise<AuthState | null>;
  login(): Promise<AuthState>;
  logout(): Promise<void>;
  ensureAppFolder(): Promise<string>; // возвращает id/путь папки
  listBackups(): Promise<
    Array<{ id: string; name: string; size: number; modified: number }>
  >;
  downloadBackup(id: string): Promise<Blob>;
  uploadBackup(
    name: string,
    data: Blob
  ): Promise<{ id: string; name: string; modified: number }>;
  deleteBackup(id: string): Promise<void>;
}
