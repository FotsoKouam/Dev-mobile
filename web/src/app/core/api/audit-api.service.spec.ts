import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditApiService } from './audit-api.service';
import { API_CONFIG } from '../api.config';
import { AuditLogItem, AuditStats } from './models/audit.model';
import { Page } from './models/school.model';

describe('AuditApiService', () => {
  let service: AuditApiService;
  let httpMock: HttpTestingController;
  const mockApiUrl = 'https://api.test';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuditApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { apiUrl: mockApiUrl },
        },
      ],
    });

    service = TestBed.inject(AuditApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  describe('getStats', () => {
    it('envoie une requête GET vers /api/audit-logs/stats avec les paramètres from et to', () => {
      const mockStats: AuditStats = {
        total: 120,
        loginSuccess: 100,
        loginFailure: 15,
        logout: 5,
      };

      service.getStats({ from: '2026-10-01T00:00:00Z', to: '2026-10-31T23:59:59Z' }).subscribe((res) => {
        expect(res).toEqual(mockStats);
      });

      const req = httpMock.expectOne(
        (request) =>
          request.url === `${mockApiUrl}/api/audit-logs/stats` &&
          request.params.get('from') === '2026-10-01T00:00:00Z' &&
          request.params.get('to') === '2026-10-31T23:59:59Z',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });
  });

  describe('getAuditLogs', () => {
    it('envoie une requête GET vers /api/audit-logs avec tous les paramètres de filtrage et pagination', () => {
      const mockResponse: Page<AuditLogItem> = {
        data: [
          {
            id: 'log-1',
            createdAt: '2026-11-03T22:41:00.000Z',
            action: 'login_success',
            result: 'success',
            target: null,
            user: { id: 'user-1', firstName: 'Paul', lastName: 'Essiane', role: 'platform_admin' },
            ipAddress: '192.0.2.14',
            details: {
              emailAttempted: null,
              failureReason: null,
              userAgent: 'Chrome 142 / Windows 11',
            },
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
        },
      };

      service
        .getAuditLogs({
          page: 1,
          limit: 10,
          action: 'login_success',
          result: 'success',
          search: 'Paul',
          from: '2026-11-01',
          to: '2026-11-03',
        })
        .subscribe((res) => {
          expect(res.data).toHaveLength(1);
          expect(res.data[0].id).toBe('log-1');
          expect(res.meta.total).toBe(1);
        });

      const req = httpMock.expectOne((request) => {
        return (
          request.url === `${mockApiUrl}/api/audit-logs` &&
          request.params.get('page') === '1' &&
          request.params.get('limit') === '10' &&
          request.params.get('action') === 'login_success' &&
          request.params.get('result') === 'success' &&
          request.params.get('search') === 'Paul' &&
          request.params.get('from') === '2026-11-01' &&
          request.params.get('to') === '2026-11-03'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getAuditLog', () => {
    it('envoie une requête GET vers /api/audit-logs/:id', () => {
      const mockItem: AuditLogItem = {
        id: 'log-123',
        createdAt: '2026-11-03T22:41:00.000Z',
        action: 'login_failure',
        result: 'failure',
        target: null,
        user: null,
        ipAddress: '198.51.100.7',
        details: {
          emailAttempted: 'unknown@example.com',
          failureReason: 'Invalid credentials',
          userAgent: 'Mozilla/5.0',
        },
      };

      service.getAuditLog('log-123').subscribe((res) => {
        expect(res).toEqual(mockItem);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/api/audit-logs/log-123`);
      expect(req.request.method).toBe('GET');
      req.flush(mockItem);
    });
  });
});
