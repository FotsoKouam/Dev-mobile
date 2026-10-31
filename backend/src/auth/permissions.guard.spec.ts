import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard.js';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('devrait autoriser si aucune permission n est requise', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const ctx = createMockContext({ permissions: [] });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('devrait autoriser si l utilisateur a la permission demandée', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['manage_users']);
    const ctx = createMockContext({
      permissions: ['manage_users', 'manage_schools'],
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('devrait rejeter (403) si l utilisateur n a pas la permission demandée', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['manage_roles']);
    const ctx = createMockContext({
      permissions: ['manage_users'],
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('devrait autoriser si l utilisateur a toutes les permissions demandées', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      'manage_schools',
      'manage_programs',
    ]);
    const ctx = createMockContext({
      permissions: ['manage_schools', 'manage_programs', 'manage_users'],
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('devrait rejeter (403) si une des permissions demandées manque', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      'manage_schools',
      'manage_roles',
    ]);
    const ctx = createMockContext({
      permissions: ['manage_schools', 'manage_programs'],
    });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('devrait rejeter (403) si l utilisateur n est pas authentifié', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['manage_schools']);
    const ctx = createMockContext(null);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

