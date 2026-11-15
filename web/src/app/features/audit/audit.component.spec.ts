import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuditComponent } from './audit.component';
import { AuditApiService } from '../../core/api/audit-api.service';
import { SessionService } from '../../core/session.service';
import { API_CONFIG } from '../../core/api.config';
import { AuditLogItem, AuditStats } from '../../core/api/models/audit.model';

describe('AuditComponent', () => {
  let component: AuditComponent;
  let fixture: ComponentFixture<AuditComponent>;
  let auditApiSpy: any;
  let sessionServiceSpy: any;

  const mockStats: AuditStats = {
    total: 1248,
    loginSuccess: 1102,
    loginFailure: 37,
    logout: 109,
  };

  const mockAuditLogs: AuditLogItem[] = [
    {
      id: 'log-1',
      createdAt: '2026-11-03T22:41:00.000Z',
      action: 'login_success',
      result: 'success',
      target: null,
      user: {
        id: 'u-1',
        firstName: 'Paul',
        lastName: 'Essiane',
        role: 'platform_admin',
      },
      ipAddress: '192.0.2.14',
      details: {
        emailAttempted: null,
        failureReason: null,
        userAgent: 'Chrome 142 / Windows 11',
      },
    },
    {
      id: 'log-2',
      createdAt: '2026-11-03T22:12:00.000Z',
      action: 'login_failure',
      result: 'failure',
      target: null,
      user: null, // Utilisateur anonyme
      ipAddress: '198.51.100.7',
      details: {
        emailAttempted: 'inconnu@example.com',
        failureReason: 'Identifiants incorrects',
        userAgent: 'Chrome 142 / Windows 11',
      },
    },
  ];

  beforeEach(async () => {
    auditApiSpy = {
      getStats: vi.fn().mockReturnValue(of(mockStats)),
      getAuditLogs: vi.fn().mockReturnValue(
        of({
          data: mockAuditLogs,
          meta: { page: 1, limit: 10, total: 2 },
        }),
      ),
      getAuditLog: vi.fn().mockImplementation((id: string) =>
        of(mockAuditLogs.find((d) => d.id === id) || mockAuditLogs[0]),
      ),
    };

    sessionServiceSpy = {
      hasPermission: vi.fn((perm: string) => {
        if (perm === 'view_audit_log' || perm === 'view_audit_logs') return true;
        return false;
      }),
      user: vi.fn().mockReturnValue({ id: 'u-1', email: 'admin@campusia.cm' }),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://api.test' } },
        { provide: AuditApiService, useValue: auditApiSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: { queryParams: {} },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé et charger les statistiques et le tableau sans clic', () => {
    expect(component).toBeTruthy();
    expect(auditApiSpy.getStats).toHaveBeenCalled();
    expect(auditApiSpy.getAuditLogs).toHaveBeenCalled();
    expect(component.auditLogs().length).toBe(2);
    expect(component.stats()).toEqual(mockStats);

    const compiled = fixture.nativeElement as HTMLElement;
    const pageTitle = compiled.querySelector('.page-title');
    expect(pageTitle?.textContent?.trim()).toBe('Audit');
  });

  it('les 4 cartes de statistiques affichent les vraies valeurs retournées par stats sans clic', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const statCards = compiled.querySelectorAll('app-stat-card');
    expect(statCards.length).toBe(4);
    expect(statCards[0].textContent).toContain('1248'); // total
    expect(statCards[1].textContent).toContain('1102'); // loginSuccess
    expect(statCards[2].textContent).toContain('37');   // loginFailure
    expect(statCards[3].textContent).toContain('109');  // logout
  });

  it('le tableau affiche les lignes réelles et gère user nul avec "—"', () => {
    component.ngAfterViewInit();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Paul Essiane');
    expect(compiled.textContent).toContain('—'); // Pour l'utilisateur anonyme
    expect(compiled.textContent).toContain('192.0.2.14');
    expect(compiled.textContent).toContain('198.51.100.7');
  });

  it('le filtre action relance l appel avec action et revient à la page 1', () => {
    component.onActionFilterChange('login_failure');
    expect(component.selectedAction()).toBe('login_failure');
    expect(component.currentPage()).toBe(1);
    expect(auditApiSpy.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login_failure',
        page: 1,
      }),
    );
  });

  it('from > to bloque l appel et affiche une erreur', () => {
    auditApiSpy.getAuditLogs.mockClear();
    auditApiSpy.getStats.mockClear();

    component.fromDate.set('2026-11-10');
    component.toDate.set('2026-11-01');

    const isValid = component.validateDates();
    expect(isValid).toBe(false);
    expect(component.dateError()).toBe(component.i18n.auditPage.filters.errors.fromAfterTo);

    component.validateAndLoad();
    expect(auditApiSpy.getAuditLogs).not.toHaveBeenCalled();
    expect(auditApiSpy.getStats).not.toHaveBeenCalled();
  });

  it('affiche l état vide "Aucun événement sur cette période." si data est vide', () => {
    auditApiSpy.getAuditLogs.mockReturnValue(
      of({ data: [], meta: { page: 1, limit: 10, total: 0 } }),
    );
    component.loadAuditLogs();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(component.i18n.auditPage.table.emptyState);
  });

  it('affiche le message 403 si l utilisateur n a pas view_audit_log', () => {
    sessionServiceSpy.hasPermission.mockReturnValue(false);

    const fixtureNoPerm = TestBed.createComponent(AuditComponent);
    const compNoPerm = fixtureNoPerm.componentInstance;
    fixtureNoPerm.detectChanges();

    expect(compNoPerm.error403()).toBe(true);
    const compiled = fixtureNoPerm.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(compNoPerm.i18n.common.forbidden);
  });
});
