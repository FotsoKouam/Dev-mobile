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
        scope: 'program',
        status: 'active',
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${mockApiUrl}/api/spaces`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('15');
    expect(req.request.params.get('search')).toBe('Graphes');
    expect(req.request.params.get('schoolId')).toBe('sch-1');
    expect(req.request.params.get('scope')).toBe('program');
    expect(req.request.params.get('status')).toBe('active');
    req.flush({ data: [], meta: { page: 2, limit: 15, total: 0 } });
  });

  it('getSpace devrait appeler GET /api/spaces/:id', () => {
    service.getSpace('sp-123').subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/spaces/sp-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'sp-123', name: 'Graphes et algorithmes' });
  });

  it('createSpace devrait appeler POST /api/schools/:schoolId/spaces avec scope et cible, jamais schoolId ni type dans le corps', () => {
    const dto: CreateSpaceDto = {
      name: 'Graphes et algorithmes',
      description: 'Algo avancée',
      scope: 'program',
      programId: 'prog-1',
    };

    let caughtError: any = null;
    service.createSpace('sch-1', dto).subscribe({
      next: () => {
        throw new Error('devrait échouer avec 409');
      },
      error: (err) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools/sch-1/spaces`);
    expect(req.request.method).toBe('POST');
    // Le corps contient scope et programId, mais ni schoolId ni type
    expect(req.request.body).toEqual({
      name: 'Graphes et algorithmes',
      description: 'Algo avancée',
      scope: 'program',
      programId: 'prog-1',
    });
    expect((req.request.body as any).schoolId).toBeUndefined();
    expect((req.request.body as any).type).toBeUndefined();

    req.flush(
      { message: 'A space with name already exists in this school' },
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

  it('getMembers, addMember et removeMember devraient appeler les bonnes routes', () => {
    service.getMembers('sp-1', 1, 10).subscribe();
    const reqMembers = httpMock.expectOne(`${mockApiUrl}/api/spaces/sp-1/members?page=1&limit=10`);
    expect(reqMembers.request.method).toBe('GET');
    reqMembers.flush({ data: [], meta: { page: 1, limit: 10, total: 0 } });

    service.addMember('sp-1', 'u-1').subscribe();
    const reqAdd = httpMock.expectOne(`${mockApiUrl}/api/spaces/sp-1/members`);
    expect(reqAdd.request.method).toBe('POST');
    expect(reqAdd.request.body).toEqual({ userId: 'u-1' });
    reqAdd.flush({ id: 'sm-1', spaceId: 'sp-1', userId: 'u-1' });

    service.removeMember('sp-1', 'u-1').subscribe();
    const reqRemove = httpMock.expectOne(`${mockApiUrl}/api/spaces/sp-1/members/u-1`);
    expect(reqRemove.request.method).toBe('DELETE');
    reqRemove.flush(null);
  });
});
