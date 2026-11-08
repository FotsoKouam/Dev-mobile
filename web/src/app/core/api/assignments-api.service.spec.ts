import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssignmentsApiService } from './assignments-api.service';
import { API_CONFIG } from '../api.config';
import { CreateAssignmentDto, UpdateAssignmentDto } from './models/assignment.model';

describe('AssignmentsApiService', () => {
  let service: AssignmentsApiService;
  let httpMock: HttpTestingController;
  const mockApiUrl = 'https://api.campusia.cm';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AssignmentsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiUrl: mockApiUrl } },
      ],
    });

    service = TestBed.inject(AssignmentsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('getAssignments devrait appeler GET /assignments avec les query params', () => {
    service
      .getAssignments({
        page: 2,
        limit: 10,
        search: 'Essiane',
        schoolId: 'school-1',
        programId: 'prog-1',
        roleCode: 'staff',
        status: 'active',
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${mockApiUrl}/api/assignments`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('search')).toBe('Essiane');
    expect(req.request.params.get('schoolId')).toBe('school-1');
    expect(req.request.params.get('programId')).toBe('prog-1');
    expect(req.request.params.get('roleCode')).toBe('staff');
    expect(req.request.params.get('status')).toBe('active');
    req.flush({ data: [], meta: { page: 2, limit: 10, total: 0 } });
  });

  it('getAssignment devrait appeler GET /assignments/:id', () => {
    service.getAssignment('assign-123').subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/assignments/assign-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'assign-123' });
  });

  it('createAssignment devrait appeler POST /assignments avec le body et propager 409', () => {
    const dto: CreateAssignmentDto = {
      userId: 'u1',
      roleCode: 'staff',
      schoolId: 's1',
      programId: 'p1',
    };

    let caughtError: any = null;
    service.createAssignment(dto).subscribe({
      next: () => {
        throw new Error('devrait échouer avec 409');
      },
      error: (err) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/assignments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);

    req.flush({ message: 'An identical assignment already exists for this user' }, { status: 409, statusText: 'Conflict' });
    expect(caughtError).toBeTruthy();
    expect(caughtError.status).toBe(409);
  });

  it('updateAssignment devrait appeler PATCH /assignments/:id avec le body', () => {
    const dto: UpdateAssignmentDto = {
      schoolId: 's2',
      programId: 'p2',
    };

    service.updateAssignment('assign-123', dto).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/assignments/assign-123`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(dto);
    req.flush({ id: 'assign-123' });
  });

  it('deactivateAssignment devrait appeler PATCH /assignments/:id/deactivate', () => {
    service.deactivateAssignment('assign-123').subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/assignments/assign-123/deactivate`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush({ id: 'assign-123', status: 'inactive' });
  });

  it('getStats devrait appeler GET /assignments/stats', () => {
    service.getStats().subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/assignments/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({ total: 10, users: 8, schools: 2, programs: 3 });
  });

  it('getSchools devrait appeler GET /schools?limit=100', () => {
    service.getSchools(100).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools?limit=100`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { page: 1, limit: 100, total: 0 } });
  });

  it('getSchoolPrograms devrait appeler GET /schools/:schoolId/programs', () => {
    service.getSchoolPrograms('school-1').subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/schools/school-1/programs`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('searchUsers devrait appeler GET /users?limit=20&search=test', () => {
    service.searchUsers('test', 20).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/users?limit=20&search=test`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { page: 1, limit: 20, total: 0 } });
  });

  it('getUser devrait appeler GET /users/:id', () => {
    service.getUser('u-1').subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/users/u-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'u-1', email: 'u1@test.cm' });
  });
});
