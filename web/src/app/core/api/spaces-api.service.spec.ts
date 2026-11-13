import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SpacesApiService } from './spaces-api.service';
import { API_CONFIG } from '../api.config';
import { CreateSpaceDto, UpdateSpaceDto } from './models/space.model';

describe('SpacesApiService', () => {
  let service: SpacesApiService;
  let httpMock: HttpTestingController;
  const mockApiUrl = 'https://api.campusia.cm';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SpacesApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiUrl: mockApiUrl } },
      ],
    });

    service = TestBed.inject(SpacesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('getSpaces devrait appeler GET /api/spaces avec les query params', () => {
    service
      .getSpaces({
        page: 2,
        limit: 15,
        search: 'Graphes',
        schoolId: 'sch-1',
        programId: 'prog-1',
        status: 'active',
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${mockApiUrl}/api/spaces`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('15');
    expect(req.request.params.get('search')).toBe('Graphes');
    expect(req.request.params.get('schoolId')).toBe('sch-1');
    expect(req.request.params.get('programId')).toBe('prog-1');
    expect(req.request.params.get('status')).toBe('active');
    req.flush({ data: [], meta: { page: 2, limit: 15, total: 0 } });
  });

  it('getSpace devrait appeler GET /api/spaces/:id', () => {
    service.getSpace('sp-123').subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/spaces/sp-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'sp-123', name: 'Graphes et algorithmes' });
  });

  it('createSpace devrait appeler POST /api/programs/:programId/spaces sans type ni programId dans le body et propager 409', () => {
    const dto: CreateSpaceDto = {
      name: 'Graphes et algorithmes',
      description: 'Algo avancée',
    };

    let caughtError: any = null;
    service.createSpace('prog-1', dto).subscribe({
      next: () => {
        throw new Error('devrait échouer avec 409');
      },
      error: (err) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/programs/prog-1/spaces`);
    expect(req.request.method).toBe('POST');
    // Le corps ne doit jamais contenir ni type ni programId
    expect(req.request.body).toEqual({
      name: 'Graphes et algorithmes',
      description: 'Algo avancée',
    });
    expect((req.request.body as any).type).toBeUndefined();
    expect((req.request.body as any).programId).toBeUndefined();

    req.flush(
      { message: 'A space with name already exists in this program' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caughtError).toBeTruthy();
    expect(caughtError.status).toBe(409);
  });

  it('updateSpace devrait appeler PATCH /api/spaces/:id avec le body', () => {
    const dto: UpdateSpaceDto = {
      name: 'Nouveau nom',
      status: 'inactive',
    };

    service.updateSpace('sp-123', dto).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/spaces/sp-123`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'sp-123', name: 'Nouveau nom', status: 'inactive' });
  });

  it('getSchools devrait appeler GET /api/schools?limit=100', () => {
    service.getSchools(100).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools?limit=100`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { page: 1, limit: 100, total: 0 } });
  });

  it('getSchoolPrograms devrait appeler GET /api/schools/:schoolId/programs', () => {
    service.getSchoolPrograms('sch-1').subscribe((res) => {
      expect(res.data.length).toBe(3);
      expect(res.data[0].name).toBe('Gestion');
      expect(res.data[1].name).toBe('ISI');
      expect(res.data[2].name).toBe('SRT');
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools/sch-1/programs`);
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [
        { id: 'prog-0', name: 'Gestion' },
        { id: 'prog-1', name: 'ISI' },
        { id: 'prog-2', name: 'SRT' },
      ],
      meta: { page: 1, limit: 50, total: 3 },
    });
  });
});

