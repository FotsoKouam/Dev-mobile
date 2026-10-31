import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SessionService, AuthSessionData } from './session.service';
import { API_CONFIG } from './api.config';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let sessionService: SessionService;
  let router: Router;

  const mockApiUrl = 'https://mock-api.example.com';
  const mockSessionData: AuthSessionData = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'mock-uuid',
      email: 'admin.fatso@example.com',
      firstName: 'Admin',
      lastName: 'Fatso',
      status: 'active',
    },
    permissions: ['manage_users', 'manage_schools'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SessionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { apiUrl: mockApiUrl },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionService = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    sessionService.clearSession();
  });

  afterEach(() => {
    httpMock.verify();
    sessionService.clearSession();
  });

  it('devrait envoyer POST /api/auth/login avec les bons identifiants et stocker la session sur 200', () => {
    service
      .login({ email: 'admin.fatso@example.com', password: 'secretpassword' })
      .subscribe((res) => {
        expect(res).toEqual(mockSessionData);
      });

    const req = httpMock.expectOne(`${mockApiUrl}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'admin.fatso@example.com',
      password: 'secretpassword',
    });

    req.flush(mockSessionData);

    expect(sessionService.getAccessToken()).toBe('mock-access-token');
    expect(sessionService.getRefreshToken()).toBe('mock-refresh-token');
    expect(sessionService.user()).toEqual(mockSessionData.user);
    expect(sessionService.hasPermission('manage_users')).toBe(true);
  });

  it('ne devrait stocker aucune session sur 401', () => {
    service
      .login({ email: 'wrong@example.com', password: 'badpassword' })
      .subscribe({
        next: () => {
          throw new Error('Devrait échouer avec 401');
        },
        error: (err) => {
          expect(err.status).toBe(401);
        },
      });

    const req = httpMock.expectOne(`${mockApiUrl}/api/auth/login`);
    req.flush({ message: 'Identifiant ou mot de passe incorrect.' }, { status: 401, statusText: 'Unauthorized' });

    expect(sessionService.getAccessToken()).toBeNull();
    expect(sessionService.getRefreshToken()).toBeNull();
    expect(sessionService.user()).toBeNull();
  });

  it('devrait appeler POST /api/auth/refresh et mettre à jour les jetons', () => {
    service.refresh('old-refresh-token').subscribe((res) => {
      expect(res.accessToken).toBe('new-access-token');
      expect(res.refreshToken).toBe('new-refresh-token');
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'old-refresh-token' });

    req.flush({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    expect(sessionService.getAccessToken()).toBe('new-access-token');
    expect(sessionService.getRefreshToken()).toBe('new-refresh-token');
  });

  it('devrait appeler POST /api/auth/logout, vider la session et naviguer vers /login', () => {
    sessionService.saveSession(mockSessionData);
    expect(sessionService.getAccessToken()).toBe('mock-access-token');

    service.logout().subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(sessionService.getAccessToken()).toBeNull();
    expect(sessionService.user()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});

