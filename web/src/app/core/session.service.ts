import { Injectable, signal, computed } from '@angular/core';

export interface UserSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface AuthSessionData {
  accessToken: string;
  refreshToken: string;
  user: UserSession;
  permissions: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly ACCESS_TOKEN_KEY = 'campusia_access_token';
  private readonly REFRESH_TOKEN_KEY = 'campusia_refresh_token';
  private readonly USER_KEY = 'campusia_user';
  private readonly PERMISSIONS_KEY = 'campusia_permissions';

  private readonly _permissions = signal<string[]>([]);
  private readonly _user = signal<UserSession | null>(null);

  readonly permissions = computed(() => this._permissions());
  readonly user = computed(() => this._user());
  readonly isAuthenticated = computed(() => !!this.getAccessToken());

  constructor() {
    this.restoreSession();
  }

  saveSession(sessionData: AuthSessionData): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.ACCESS_TOKEN_KEY, sessionData.accessToken);
      sessionStorage.setItem(this.REFRESH_TOKEN_KEY, sessionData.refreshToken);
      sessionStorage.setItem(this.USER_KEY, JSON.stringify(sessionData.user));
      sessionStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(sessionData.permissions || []));
    }
    this._user.set(sessionData.user);
    this._permissions.set(sessionData.permissions || []);
  }

  updateTokens(accessToken: string, refreshToken: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  getAccessToken(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  getRefreshToken(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  hasPermission(permission: string): boolean {
    return this._permissions().includes(permission);
  }

  clearSession(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
      sessionStorage.removeItem(this.PERMISSIONS_KEY);
    }
    this._user.set(null);
    this._permissions.set([]);
  }

  private restoreSession(): void {
    if (typeof sessionStorage !== 'undefined') {
      const userRaw = sessionStorage.getItem(this.USER_KEY);
      const permissionsRaw = sessionStorage.getItem(this.PERMISSIONS_KEY);

      if (userRaw) {
        try {
          this._user.set(JSON.parse(userRaw));
        } catch {
          this._user.set(null);
        }
      }

      if (permissionsRaw) {
        try {
          this._permissions.set(JSON.parse(permissionsRaw));
        } catch {
          this._permissions.set([]);
        }
      }
    }
  }
}

