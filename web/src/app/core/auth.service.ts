import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { API_CONFIG } from './api.config';
import { SessionService, AuthSessionData } from './session.service';

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  private get baseUrl(): string {
    return this.config.apiUrl.replace(/\/+$/, '');
  }

  login(payload: LoginPayload): Observable<AuthSessionData> {
    return this.http
      .post<AuthSessionData>(`${this.baseUrl}/api/auth/login`, payload)
      .pipe(
        tap((res) => {
          this.sessionService.saveSession(res);
        }),
      );
  }

  refresh(refreshToken: string): Observable<RefreshResponse> {
    return this.http
      .post<RefreshResponse>(`${this.baseUrl}/api/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          this.sessionService.updateTokens(res.accessToken, res.refreshToken);
        }),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/api/auth/logout`, {})
      .pipe(
        catchError(() => of(undefined)),
        tap(() => {
          this.sessionService.clearSession();
          this.router.navigate(['/login']);
        }),
      );
  }
}

