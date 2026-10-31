import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';
import { API_CONFIG } from './api.config';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let sessionService: SessionService;

  const mockApiUrl = 'https://mock-api.example.com';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        SessionService,
        AuthService,
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

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    sessionService = TestBed.inject(SessionService);
    sessionService.clearSession();
  });

  afterEach(() => {
    httpMock.verify();
    sessionService.clearSession();
  });

  it('devrait ajouter l en-tête Authorization: Bearer sur une requête protégée vers l API', () => {
    sessionService.saveSession({
      accessToken: 'valid-test-access-token',
      refreshToken: 'valid-test-refresh-token',
      user: { id: 'u1', email: 'test@example.com', firstName: 'A', lastName: 'B', status: 'active' },
      permissions: [],
    });

    httpClient.get(`${mockApiUrl}/api/schools`).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools`);
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid-test-access-token');
    req.flush([]);
  });

  it('ne devrait PAS ajouter l en-tête Authorization sur /api/auth/login', () => {
    sessionService.saveSession({
      accessToken: 'valid-test-access-token',
      refreshToken: 'valid-test-refresh-token',
      user: { id: 'u1', email: 'test@example.com', firstName: 'A', lastName: 'B', status: 'active' },
      permissions: [],
    });

    httpClient.post(`${mockApiUrl}/api/auth/login`, { email: 'a', password: 'b' }).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('ne devrait PAS ajouter l en-tête Authorization sur /api/auth/refresh', () => {
    sessionService.saveSession({
      accessToken: 'valid-test-access-token',
      refreshToken: 'valid-test-refresh-token',
      user: { id: 'u1', email: 'test@example.com', firstName: 'A', lastName: 'B', status: 'active' },
      permissions: [],
    });

    httpClient.post(`${mockApiUrl}/api/auth/refresh`, { refreshToken: 'r' }).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/auth/refresh`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ accessToken: 'new-a', refreshToken: 'new-r' });
  });
});

