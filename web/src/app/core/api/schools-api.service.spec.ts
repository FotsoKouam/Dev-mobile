import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SchoolsApiService } from './schools-api.service';
import { API_CONFIG } from '../api.config';
import {
  School,
  SchoolStats,
  Program,
  Page,
  CreateSchoolDto,
  UpdateSchoolDto,
  CreateProgramDto,
  UpdateProgramDto,
} from './models/school.model';

describe('SchoolsApiService', () => {
  let service: SchoolsApiService;
  let httpMock: HttpTestingController;

  const mockApiUrl = 'https://mock-api.example.com';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SchoolsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { apiUrl: mockApiUrl },
        },
      ],
    });

    service = TestBed.inject(SchoolsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait récupérer la liste des écoles avec paramètres', () => {
    const mockPage: Page<School> = {
      data: [
        {
          id: 's1',
          name: 'École Test',
          type: 'private',
          city: 'Yaoundé',
          status: 'active',
          programsCount: 2,
          usersCount: 0,
          spacesCount: 0,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      meta: { page: 1, limit: 10, total: 1 },
    };

    service
      .getSchools({ page: 1, limit: 10, status: 'active', type: 'private', search: 'Test' })
      .subscribe((res) => {
        expect(res).toEqual(mockPage);
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${mockApiUrl}/api/schools` &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '10' &&
        r.params.get('status') === 'active' &&
        r.params.get('type') === 'private' &&
        r.params.get('search') === 'Test',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('devrait récupérer les statistiques', () => {
    const mockStats: SchoolStats = {
      schools: { active: 4, total: 5 },
      programs: { active: 9, total: 10 },
      users: { active: 0, total: 0 },
      institutionalSpaces: { active: 0, total: 0 },
    };

    service.getStats().subscribe((res) => {
      expect(res).toEqual(mockStats);
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools/stats`);
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('devrait récupérer le détail d une école', () => {
    const mockSchool: School = {
      id: 's1',
      name: 'École Test',
      type: 'private',
      city: 'Yaoundé',
      status: 'active',
      programsCount: 1,
      usersCount: 0,
      spacesCount: 0,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    service.getSchool('s1').subscribe((res) => {
      expect(res).toEqual(mockSchool);
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools/s1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSchool);
  });

  it('devrait créer une école et propager une erreur 409', () => {
    const dto: CreateSchoolDto = {
      name: 'École Doublon',
      type: 'public',
      city: 'Douala',
    };

    service.createSchool(dto).subscribe({
      next: () => {
        throw new Error('Devrait échouer avec 409');
      },
      error: (err) => {
        expect(err.status).toBe(409);
      },
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ message: 'Une école porte déjà ce nom.' }, { status: 409, statusText: 'Conflict' });
  });

  it('devrait modifier une école', () => {
    const dto: UpdateSchoolDto = { status: 'inactive' };

    service.updateSchool('s1', dto).subscribe((res) => {
      expect(res.status).toBe('inactive');
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools/s1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 's1', status: 'inactive' });
  });

  it('devrait récupérer les filières d une école', () => {
    const mockPage: Page<Program> = {
      data: [
        {
          id: 'p1',
          schoolId: 's1',
          name: 'ISI',
          status: 'active',
          usersCount: 0,
          spacesCount: 0,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      meta: { page: 1, limit: 10, total: 1 },
    };

    service.getPrograms('s1', { page: 1, limit: 10 }).subscribe((res) => {
      expect(res).toEqual(mockPage);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${mockApiUrl}/api/schools/s1/programs` &&
        r.params.get('page') === '1',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPage);
  });

  it('devrait créer une filière et modifier une filière', () => {
    const createDto: CreateProgramDto = { name: 'SRT' };
    service.createProgram('s1', createDto).subscribe((res) => {
      expect(res.name).toBe('SRT');
    });

    const req1 = httpMock.expectOne(`${mockApiUrl}/api/schools/s1/programs`);
    expect(req1.request.method).toBe('POST');
    req1.flush({ id: 'p2', schoolId: 's1', name: 'SRT' });

    const updateDto: UpdateProgramDto = { name: 'SRT V2' };
    service.updateProgram('p2', updateDto).subscribe((res) => {
      expect(res.name).toBe('SRT V2');
    });

    const req2 = httpMock.expectOne(`${mockApiUrl}/api/programs/p2`);
    expect(req2.request.method).toBe('PATCH');
    req2.flush({ id: 'p2', name: 'SRT V2' });
  });
});

