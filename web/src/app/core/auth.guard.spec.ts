import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { SessionService } from './session.service';

describe('authGuard', () => {
  let sessionService: SessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        {
          provide: Router,
          useValue: {
            createUrlTree: vi.fn().mockImplementation((commands) => ({ url: commands.join('/') } as unknown as UrlTree)),
          },
        },
      ],
    });

    sessionService = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    sessionService.clearSession();
  });

  afterEach(() => {
    sessionService.clearSession();
  });

  it('devrait autoriser l accès si une session est stockée', () => {
    sessionService.saveSession({
      accessToken: 'valid-token',
      refreshToken: 'valid-refresh',
      user: {
        id: '1',
        email: 'admin@campusia.com',
        firstName: 'Admin',
        lastName: 'Fatso',
        status: 'active',
      },
      permissions: ['manage_schools'],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('devrait refuser l accès et rediriger vers /login si aucune session n est stockée', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).not.toBe(true);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
