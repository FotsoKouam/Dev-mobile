import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { UsersApiService } from '../../core/api/users-api.service';
import { SpacesApiService } from '../../core/api/spaces-api.service';
import { DocumentsApiService } from '../../core/api/documents-api.service';
import { AuditApiService } from '../../core/api/audit-api.service';
import { SessionService } from '../../core/session.service';
import { API_CONFIG } from '../../core/api.config';
import { SchoolStats, School, Page } from '../../core/api/models/school.model';
import { UserStats } from '../../core/api/models/user.model';
import { DocumentStats } from '../../core/api/models/document.model';
import { AuditLogItem } from '../../core/api/models/audit.model';
import { Space } from '../../core/api/models/space.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  let schoolsApiSpy: {
    getStats: ReturnType<typeof vi.fn>;
    getSchools: ReturnType<typeof vi.fn>;
  };
  let usersApiSpy: {
    getStats: ReturnType<typeof vi.fn>;
  };
  let spacesApiSpy: {
    getSpaces: ReturnType<typeof vi.fn>;
  };
  let documentsApiSpy: {
    getStats: ReturnType<typeof vi.fn>;
  };
  let auditApiSpy: {
    getAuditLogs: ReturnType<typeof vi.fn>;
  };
  let sessionServiceSpy: {
    hasPermission: ReturnType<typeof vi.fn>;
    user: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };

  const mockSchoolStats: SchoolStats = {
    schools: { active: 4, total: 5 },
    programs: { active: 9, total: 10 },
    users: { active: 218, total: 225 },
    institutionalSpaces: { active: 16, total: 17 },
  };

  const mockUserStats: UserStats = {
    users: { active: 218, total: 225 },
    byRole: {
      platform_admin: 2,
      school_admin: 5,
      staff: 24,
      student: 180,
      guest: 14,
    },
  };

  const mockSpacesPage: Page<Space> = {
    data: [
      {
        id: 'space-1',
        name: 'Développement mobile',
        description: 'Espace cours',
        scope: 'program',
        scopeProgramId: 'prog-1',
        scopeRoleCode: null,
        scopeProgram: { id: 'prog-1', name: 'ISI' },
        status: 'active',
        school: { id: 'sch-1', name: 'Institut Saint Jean' },
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
      },
    ],
    meta: {
      page: 1,
      limit: 1,
      total: 16,
    },
  };

  const mockDocStats: DocumentStats = {
    total: 142,
    available: 128,
    processing: 9,
    error: 5,
  };

  const mockAuditLogs: AuditLogItem[] = [
    {
      id: 'log-1',
      createdAt: '2026-11-15T10:30:00Z',
      action: 'login_success',
      result: 'success',
      target: null,
      user: {
        id: 'u-1',
        firstName: 'Marie',
        lastName: 'Mbalila',
        role: 'platform_admin',
      },
      ipAddress: '192.0.2.1',
      details: {},
    },
    {
      id: 'log-2',
      createdAt: '2026-11-15T09:15:00Z',
      action: 'login_failure',
      result: 'failure',
      target: null,
      user: null,
      ipAddress: '198.51.100.2',
      details: { emailAttempted: 'inconnu@test.com' },
    },
  ];

  const mockTopSchools: Page<School> = {
    data: [
      {
        id: 'sch-1',
        name: 'Institut Universitaire Saint Jean',
        type: 'private',
        city: 'Yaoundé',
        status: 'active',
        programsCount: 3,
        usersCount: 0,
        spacesCount: 0,
        createdAt: '2026-10-21T09:30:00Z',
        updatedAt: '2026-10-21T09:30:00Z',
      },
      {
        id: 'sch-2',
        name: 'Université de Douala',
        type: 'public',
        city: 'Douala',
        status: 'active',
        programsCount: 2,
        usersCount: 44,
        spacesCount: 0,
        createdAt: '2026-10-22T09:30:00Z',
        updatedAt: '2026-10-22T09:30:00Z',
      },
    ],
    meta: {
      page: 1,
      limit: 5,
      total: 2,
    },
  };

  beforeEach(async () => {
    schoolsApiSpy = {
      getStats: vi.fn().mockReturnValue(of(mockSchoolStats)),
      getSchools: vi.fn().mockReturnValue(of(mockTopSchools)),
    };
    usersApiSpy = {
      getStats: vi.fn().mockReturnValue(of(mockUserStats)),
    };
    spacesApiSpy = {
      getSpaces: vi.fn().mockReturnValue(of(mockSpacesPage)),
    };
    documentsApiSpy = {
      getStats: vi.fn().mockReturnValue(of(mockDocStats)),
    };
    auditApiSpy = {
      getAuditLogs: vi.fn().mockReturnValue(of({ data: mockAuditLogs, meta: { page: 1, limit: 5, total: 2 } })),
    };
    sessionServiceSpy = {
      hasPermission: vi.fn().mockReturnValue(true), // All permissions granted by default
      user: vi.fn().mockReturnValue({ id: 'u-1', firstName: 'Jean', lastName: 'Pierre', email: 'admin@campusia.cm' }),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://api.test' } },
        { provide: SchoolsApiService, useValue: schoolsApiSpy },
        { provide: UsersApiService, useValue: usersApiSpy },
        { provide: SpacesApiService, useValue: spacesApiSpy },
        { provide: DocumentsApiService, useValue: documentsApiSpy },
        { provide: AuditApiService, useValue: auditApiSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait se créer et charger tous les blocs réels sans clic', () => {
    expect(component).toBeTruthy();
    expect(schoolsApiSpy.getStats).toHaveBeenCalled();
    expect(schoolsApiSpy.getSchools).toHaveBeenCalledWith({ limit: 5 });
    expect(usersApiSpy.getStats).toHaveBeenCalled();
    expect(spacesApiSpy.getSpaces).toHaveBeenCalledWith({ limit: 1 });
    expect(documentsApiSpy.getStats).toHaveBeenCalled();
    expect(auditApiSpy.getAuditLogs).toHaveBeenCalledWith({ limit: 5 });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.page-title')?.textContent?.trim()).toBe('Tableau de bord');

    // Cartes statistiques
    const statCards = compiled.querySelectorAll('app-stat-card');
    expect(statCards.length).toBe(5);
    expect(statCards[0].textContent).toContain('4');
    expect(statCards[1].textContent).toContain('9');
    expect(statCards[2].textContent).toContain('218');
    expect(statCards[3].textContent).toContain('16');
    expect(statCards[4].textContent).toContain('128');

    // Activité récente lit res.data
    expect(component.recentActivity().length).toBe(2);
    expect(compiled.textContent).toContain('Marie Mbalila');
    expect(compiled.textContent).toContain('Connexion réussie');
    expect(compiled.textContent).toContain('Anonyme');
    expect(compiled.textContent).toContain('Échec de connexion');

    // Aperçu des écoles
    expect(component.topSchools().length).toBe(2);
    expect(compiled.textContent).toContain('Institut Universitaire Saint Jean');
    expect(compiled.textContent).toContain('Université de Douala');
  });

  it('les blocs alertes et graphique affichent leur EmptyState respectif sans appel API', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyStates = compiled.querySelectorAll('app-empty-state');
    expect(emptyStates.length).toBe(2);
    expect(compiled.textContent).toContain('Les alertes seront disponibles dans une prochaine version.');
    expect(compiled.textContent).toContain('Le graphique d’activité sera disponible dans une prochaine version.');
  });

  it('un échec sur un bloc n’empêche pas les autres de s’afficher et affiche « — » uniquement dans ce bloc', async () => {
    // Reconfigure TestBed with schoolsApi failing on getStats
    schoolsApiSpy.getStats.mockReturnValue(throwError(() => new Error('Network error')));
    schoolsApiSpy.getSchools.mockReturnValue(of(mockTopSchools));

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorSchoolStats()).toBe(true);
    expect(component.errorUserStats()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    const statCards = compiled.querySelectorAll('app-stat-card');
    // School and program stat values show '—'
    expect(statCards[0].textContent).toContain('—');
    expect(statCards[1].textContent).toContain('—');
    // Other cards still display their real data
    expect(statCards[2].textContent).toContain('218');
    expect(statCards[3].textContent).toContain('16');
    expect(statCards[4].textContent).toContain('128');
  });

  it('un bloc sans permission n’apparaît pas dans le DOM (pas grisé)', async () => {
    // User without manage_users permission
    sessionServiceSpy.hasPermission.mockImplementation((perm: string) => {
      return perm !== 'manage_users';
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    // Users stat card should not be in the DOM
    expect(compiled.querySelector('.roles-section')).toBeNull();
    // Only 4 stat cards instead of 5
    const statCards = compiled.querySelectorAll('app-stat-card');
    expect(statCards.length).toBe(4);
  });
});
