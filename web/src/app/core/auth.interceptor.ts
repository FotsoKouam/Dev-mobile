import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_CONFIG } from './api.config';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const config = inject(API_CONFIG);
  const sessionService = inject(SessionService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const baseUrl = config.apiUrl.replace(/\/+$/, '');
  const isApiRequest = req.url.startsWith(baseUrl);
  const isAuthLogin = req.url.includes('/api/auth/login');
  const isAuthRefresh = req.url.includes('/api/auth/refresh');

  let authReq = req;
  const token = sessionService.getAccessToken();

  if (isApiRequest && !isAuthLogin && !isAuthRefresh && token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest &&
        !isAuthLogin &&
        !isAuthRefresh
      ) {
        const refreshToken = sessionService.getRefreshToken();
        if (refreshToken && !isRefreshing) {
          isRefreshing = true;
          return authService.refresh(refreshToken).pipe(
            switchMap((refreshRes) => {
              isRefreshing = false;
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${refreshRes.accessToken}`,
                },
              });
              return next(retryReq);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              sessionService.clearSession();
              router.navigate(['/login']);
              return throwError(() => refreshErr);
            }),
          );
        } else {
          sessionService.clearSession();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};

