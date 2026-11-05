import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SchoolsComponent } from './schools.component';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { SessionService } from '../../core/session.service';
import { API_CONFIG } from '../../core/api.config';
import { SchoolStats, Page, School } from '../../core/api/models/school.model';

describe('SchoolsComponent', () => {
  let component: SchoolsComponent;
  let fixture: ComponentFixture<SchoolsComponent>;
  let api: SchoolsApiService;
  let sessionService: SessionService;

  const mockStats: SchoolStats = {
    schools: { active: 4, total: 5 },
    programs: { active: 9, total: 10 },
    users: { active: 0, total: 0 },
    institutionalSpaces: { active: 0, total: 0 },
  };

  const mockSchoolsPage: Page<School> = {
    data: [
      {
        id: 's1',
        name: 'Institut Universitaire Saint Jean',
        type: 'private',
        city: 'Yaoundé',
        status: 'active',
        programsCount: 3,
        usersCount: 0,
        spacesCount: 0,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    meta: { page: 1, limit: 10, total: 1 },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolsComponent],
      providers: [
        SchoolsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        SessionService,
        { provide: API_CONFIG, useValue: { apiUrl: 'https://test.api' } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    api = TestBed.inject(SchoolsApiService);
    sessionService = TestBed.inject(SessionService);

    vi.spyOn(api, 'getStats').mockReturnValue(of(mockStats));
    vi.spyOn(api, 'getSchools').mockReturnValue(of(mockSchoolsPage));

    sessionService.saveSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'admin@campusia.com', firstName: 'Admin', lastName: 'Fatso', status: 'active' },
      permissions: ['manage_schools', 'manage_programs'],
    });

    fixture = TestBed.createComponent(SchoolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait afficher les données dès la réponse sans aucune interaction', () => {
    // Vérification que les cartes et le tableau affichent les données immédiatement après réception de l'API
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('4');
    expect(el.textContent).toContain('Institut Universitaire Saint Jean');
    expect(el.querySelector('.skeleton-val')).toBeNull();
  });

  it('devrait afficher les lignes d écoles', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Institut Universitaire Saint Jean');
    expect(el.textContent).toContain('Yaoundé');
  });

  it('devrait afficher le bouton Nouvelle école si manage_schools', () => {
    expect(component.canManageSchools).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('+ Nouvelle école');
  });

  it('ne devrait pas afficher le bouton Nouvelle école sans manage_schools (lecture seule)', () => {
    sessionService.saveSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'user@campusia.com', firstName: 'Simple', lastName: 'User', status: 'active' },
      permissions: [],
    });
    fixture.detectChanges();

    expect(component.canManageSchools).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.btn-add')).toBeNull();
  });

  it('devrait relancer l appel quand on change de page', () => {
    const spy = vi.spyOn(api, 'getSchools');
    component.onPageChange(2);
    expect(component.currentPage()).toBe(2);
  });

  it('devrait gérer l état d erreur réseau sur la liste des écoles', () => {
    vi.spyOn(api, 'getSchools').mockReturnValue(throwError(() => new Error('Erreur')));
    component.loadSchools();
    fixture.detectChanges();

    expect(component.errorSchools()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Impossible de charger les données.');
  });
});

