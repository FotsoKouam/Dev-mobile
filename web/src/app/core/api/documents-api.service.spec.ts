import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { DocumentsApiService } from './documents-api.service';
import { API_CONFIG } from '../api.config';
import { DocumentStats, DocumentItem } from './models/document.model';

describe('DocumentsApiService', () => {
  let service: DocumentsApiService;
  let httpMock: HttpTestingController;
  const mockApiUrl = 'https://api.campusia.cm';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DocumentsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiUrl: mockApiUrl } },
      ],
    });

    service = TestBed.inject(DocumentsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('getStats envoie GET /api/documents/stats avec query params optionnels', () => {
    const mockStats: DocumentStats = {
      total: 10,
      available: 8,
      processing: 2,
      error: 0,
    };

    service.getStats('sch-1', 'prog-1').subscribe((res) => {
      expect(res).toEqual(mockStats);
    });

    const req = httpMock.expectOne(
      `${mockApiUrl}/api/documents/stats?schoolId=sch-1&programId=prog-1`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('getDocuments envoie GET /api/documents avec tous les filtres', () => {
    service
      .getDocuments({
        page: 2,
        limit: 10,
        spaceId: 'sp-1',
        programId: 'prog-1',
        schoolId: 'sch-1',
        status: 'pending',
        fileType: 'pdf',
        search: 'Graphes',
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${mockApiUrl}/api/documents`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('spaceId')).toBe('sp-1');
    expect(req.request.params.get('programId')).toBe('prog-1');
    expect(req.request.params.get('schoolId')).toBe('sch-1');
    expect(req.request.params.get('status')).toBe('pending');
    expect(req.request.params.get('fileType')).toBe('pdf');
    expect(req.request.params.get('search')).toBe('Graphes');
    req.flush({ data: [], meta: { page: 2, limit: 10, total: 0 } });
  });

  it('getDocument envoie GET /api/documents/:id', () => {
    service.getDocument('doc-123').subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/documents/doc-123`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'doc-123', name: 'Cours.pdf' });
  });

  it('uploadDocument envoie POST /api/spaces/:spaceId/documents avec FormData sans Content-Type forcé', () => {
    const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const file = new File([blob], 'test.pdf', { type: 'application/pdf' });

    service.uploadDocument('space-1', file, 'Mon Super Document').subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/spaces/space-1/documents`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    const formData = req.request.body as FormData;
    expect(formData.get('file')).toBeTruthy();
    expect(formData.get('name')).toBe('Mon Super Document');
    // Le Content-Type ne doit pas être fixé manuellement
    expect(req.request.headers.has('Content-Type')).toBe(false);

    req.flush({ id: 'doc-new', name: 'Mon Super Document' });
  });

  it('addDocumentVersion envoie POST /api/documents/:id/versions avec FormData sans Content-Type forcé', () => {
    const blob = new Blob(['%PDF-1.4 v2'], { type: 'application/pdf' });
    const file = new File([blob], 'v2.pdf', { type: 'application/pdf' });

    service.addDocumentVersion('doc-123', file).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/documents/doc-123/versions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    const formData = req.request.body as FormData;
    expect(formData.get('file')).toBeTruthy();
    expect(req.request.headers.has('Content-Type')).toBe(false);

    req.flush({ id: 'doc-123', version: 2 });
  });

  it('getDocumentVersions envoie GET /api/documents/:id/versions avec pagination', () => {
    service.getDocumentVersions('doc-123', 2, 5).subscribe();

    const req = httpMock.expectOne(`${mockApiUrl}/api/documents/doc-123/versions?page=2&limit=5`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { page: 2, limit: 5, total: 0 } });
  });

  it('downloadDocument envoie GET /api/documents/:id/download en Blob', () => {
    service.downloadDocument('doc-123').subscribe((res) => {
      expect(res instanceof Blob).toBe(true);
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/documents/doc-123/download`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['file-content'], { type: 'application/pdf' }));
  });

  it('downloadDocumentVersion envoie GET /api/documents/:id/versions/:versionId/download en Blob', () => {
    service.downloadDocumentVersion('doc-123', 'ver-456').subscribe((res) => {
      expect(res instanceof Blob).toBe(true);
    });

    const req = httpMock.expectOne(`${mockApiUrl}/api/documents/doc-123/versions/ver-456/download`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['v1-content'], { type: 'application/pdf' }));
  });
});
