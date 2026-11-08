import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RolesApiService } from './roles-api.service';
import { API_CONFIG } from '../api.config';
import {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  Page,
} from './models/role.model';
import { User } from './models/user.model';

describe('RolesApiService', () => {
  let service: RolesApiService;
  let httpMock: HttpTestingController;

  const mockApiUrl = 'https://mock-api.example.com';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RolesApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { apiUrl: mockApiUrl },
        },
      ],
    });

    service = TestBed.inject(RolesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait récupérer la liste des rôles avec pagination et filtres', () => {
    const mockPage: Page<Role> = {
      data: [
        {
          id: 'r1',
          code: 'staff',
          name: 'Personnel',
          description: 'Personnel enseignant ou administratif',
          isSystem: true,
          status: 'active',
          permissions: ['add_document'],
          usersCount: 24,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 10, total: 1 },
    };

    service
      .getRoles({ page: 1, limit: 10, type: 'system', status: 'active' })
      .subscribe((res) => {
        expect(res).toEqual(mockPage);
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${mockApiUrl}/api/roles` &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '10' &&
        r.params.get('type') === 'system' &&
        r.params.get('status') === 'active',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('devrait récupérer le détail d un rôle', () => {
    const mockRole: Role = {
      id: 'r1',
      code: 'staff',
      name: 'Personnel',
      description: null,
      isSystem: true,
      status: 'active',
      permissions: ['add_document'],
      usersCount: 24,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    service.getRole('r1').subscribe((res) => {
      expect(res).toEqual(mockRole);
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/roles/r1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRole);
  });

  it('devrait créer un rôle personnalisé et propager une erreur 409', () => {
    const dto: CreateRoleDto = {
      name: 'Responsable Pédagogique',
      permissions: ['add_document'],
    };

    service.createRole(dto).subscribe({
      next: () => {
        throw new Error('Devrait échouer avec 409');
      },
      error: (err) => {
        expect(err.status).toBe(409);
      },
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/roles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ message: 'Un rôle avec ce nom/code existe déjà' }, { status: 409, statusText: 'Conflict' });
  });

  it('devrait modifier un rôle', () => {
    const dto: UpdateRoleDto = {
      name: 'Responsable Pédagogique Modifié',
    };

    service.updateRole('r2', dto).subscribe((res) => {
      expect(res.name).toBe('Responsable Pédagogique Modifié');
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/roles/r2`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'r2', name: 'Responsable Pédagogique Modifié' });
  });

  it('devrait changer le statut d un rôle (désactiver / réactiver)', () => {
    service.updateRoleStatus('r2', 'inactive').subscribe((res) => {
      expect(res.status).toBe('inactive');
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/roles/r2`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'inactive' });
    req.flush({ id: 'r2', status: 'inactive' });
  });

  it('devrait récupérer les utilisateurs associés à un rôle', () => {
    const mockUsersPage: Page<User> = {
      data: [
        {
          id: 'u1',
          email: 'test@campusia.cm',
          firstName: 'Paul',
          lastName: 'Essiane',
          phone: null,
          authMethod: 'google',
          status: 'active',
          lastLoginAt: null,
          assignments: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      meta: { page: 1, limit: 5, total: 1 },
    };

    service.getUsersByRole('staff', 5).subscribe((res) => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].email).toBe('test@campusia.cm');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${mockApiUrl}/api/users` &&
        r.params.get('roleCode') === 'staff' &&
        r.params.get('limit') === '5',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockUsersPage);
  });
});

