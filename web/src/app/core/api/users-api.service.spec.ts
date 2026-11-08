import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersApiService } from './users-api.service';
import { API_CONFIG } from '../api.config';
import {
  User,
  UserStats,
  CreateUserDto,
  UpdateUserDto,
  Page,
} from './models/user.model';

describe('UsersApiService', () => {
  let service: UsersApiService;
  let httpMock: HttpTestingController;

  const mockApiUrl = 'https://mock-api.example.com';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UsersApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { apiUrl: mockApiUrl },
        },
      ],
    });

    service = TestBed.inject(UsersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait récupérer la liste des utilisateurs avec filtres et pagination', () => {
    const mockPage: Page<User> = {
      data: [
        {
          id: 'u1',
          email: 'paul.essiane@campusia.cm',
          firstName: 'Paul',
          lastName: 'Essiane',
          phone: null,
          authMethod: 'google',
          status: 'active',
          lastLoginAt: '2026-09-10T10:28:00.000Z',
          assignments: [],
          createdAt: '2026-06-05T14:20:00.000Z',
          updatedAt: '2026-06-05T14:20:00.000Z',
        },
      ],
      meta: { page: 1, limit: 10, total: 1 },
    };

    service
      .getUsers({
        page: 1,
        limit: 10,
        search: 'Paul',
        status: 'active',
        roleCode: 'staff',
        schoolId: 's1',
        programId: 'p1',
      })
      .subscribe((res) => {
        expect(res).toEqual(mockPage);
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${mockApiUrl}/api/users` &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '10' &&
        r.params.get('search') === 'Paul' &&
        r.params.get('status') === 'active' &&
        r.params.get('roleCode') === 'staff' &&
        r.params.get('schoolId') === 's1' &&
        r.params.get('programId') === 'p1',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('devrait récupérer les statistiques utilisateurs', () => {
    const mockStats: UserStats = {
      users: { active: 218, total: 225 },
      byRole: {
        platform_admin: 2,
        school_admin: 5,
        staff: 24,
        student: 180,
        guest: 14,
      },
    };

    service.getStats().subscribe((res) => {
      expect(res).toEqual(mockStats);
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/users/stats`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('devrait récupérer le détail d un utilisateur', () => {
    const mockUser: User = {
      id: 'u1',
      email: 'paul.essiane@campusia.cm',
      firstName: 'Paul',
      lastName: 'Essiane',
      phone: '+237 6 12 34 56 78',
      authMethod: 'google',
      status: 'active',
      lastLoginAt: '2026-09-10T10:28:00.000Z',
      assignments: [],
      createdAt: '2026-06-05T14:20:00.000Z',
      updatedAt: '2026-06-05T14:20:00.000Z',
    };

    service.getUser('u1').subscribe((res) => {
      expect(res).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/users/u1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  it('devrait créer / inviter un utilisateur et propager une erreur 409', () => {
    const dto: CreateUserDto = {
      email: 'doublon@campusia.cm',
      firstName: 'Jean',
      lastName: 'Dupont',
      authMethod: 'google',
    };

    service.createUser(dto).subscribe({
      next: () => {
        throw new Error('Devrait échouer avec 409');
      },
      error: (err) => {
        expect(err.status).toBe(409);
      },
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ message: 'Un utilisateur avec cet email existe déjà.' }, { status: 409, statusText: 'Conflict' });
  });

  it('devrait modifier un utilisateur', () => {
    const dto: UpdateUserDto = {
      firstName: 'Paul Updated',
      lastName: 'Essiane Updated',
    };

    service.updateUser('u1', dto).subscribe((res) => {
      expect(res.firstName).toBe('Paul Updated');
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/users/u1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'u1', firstName: 'Paul Updated' });
  });

  it('devrait modifier le statut d un utilisateur (suspendre/réactiver)', () => {
    service.updateUserStatus('u1', 'suspended').subscribe((res) => {
      expect(res.status).toBe('suspended');
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/users/u1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'suspended' });
    req.flush({ id: 'u1', status: 'suspended' });
  });

  it('devrait récupérer les affectations d un utilisateur', () => {
    const mockUser: User = {
      id: 'u1',
      email: 'paul.essiane@campusia.cm',
      firstName: 'Paul',
      lastName: 'Essiane',
      phone: null,
      authMethod: 'google',
      status: 'active',
      lastLoginAt: null,
      assignments: [
        {
          id: 'a1',
          role: { id: 'r1', code: 'staff', name: 'Personnel' },
          school: { id: 's1', name: 'Institut Saint Jean' },
          program: { id: 'p1', name: 'ISI' },
          status: 'active',
        },
      ],
      createdAt: '2026-06-05T14:20:00.000Z',
      updatedAt: '2026-06-05T14:20:00.000Z',
    };

    service.getUserAssignments('u1').subscribe((assignments) => {
      expect(assignments.length).toBe(1);
      expect(assignments[0].program?.name).toBe('ISI');
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/users/u1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });
});

