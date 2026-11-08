import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UsersComponent } from './users.component';
import { UsersApiService } from '../../core/api/users-api.service';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { SessionService } from '../../core/session.service';
import { API_CONFIG } from '../../core/api.config';
import { UserStats, Page, User } from '../../core/api/models/user.model';
import { School } from '../../core/api/models/school.model';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let usersApi: UsersApiService;
  let schoolsApi: SchoolsApiService;
  let sessionService: SessionService;

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

  const mockUsersPage: Page<User> = {
    data: [
      {
        id: 'u1',
        email: 'paul.essiane@campusia.cm',
        firstName: 'Paul',
        lastName: 'Essiane',
        phone: '+237 6 12 34 56 78',
        authMethod: 'google',
        status: 'active',
        lastLoginAt: '2026-09-10T10:28:00.000Z',
        assignments: [
          {
            id: 'a1',
            role: { id: 'r1', code: 'staff', name: 'Personnel' },
            school: { id: 's1', name: 'Institut Universitaire Saint Jean' },
            program: { id: 'p1', name: 'ISI' },
            status: 'active',
          },
        ],
        createdAt: '2026-06-05T14:20:00.000Z',
        updatedAt: '2026-06-05T14:20:00.000Z',
      },
    ],
    meta: { page: 1, limit: 10, total: 1 },
  };

  const mockSchoolsPage: Page<School> = {
    data: [
      {
        id: 's1',
        name: 'Institut Universitaire Saint Jean',
        type: 'private',
        city: 'Yaoundé',
        status: 'active',
        programsCount: 1,
        usersCount: 1,
        spacesCount: 0,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ],
    meta: { page: 1, limit: 100, total: 1 },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        UsersApiService,
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

    usersApi = TestBed.inject(UsersApiService);
    schoolsApi = TestBed.inject(SchoolsApiService);
    sessionService = TestBed.inject(SessionService);

    vi.spyOn(usersApi, 'getStats').mockReturnValue(of(mockStats));
    vi.spyOn(usersApi, 'getUsers').mockReturnValue(of(mockUsersPage));
    vi.spyOn(schoolsApi, 'getSchools').mockReturnValue(of(mockSchoolsPage));

    sessionService.saveSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'u_current', email: 'admin@campusia.cm', firstName: 'Admin', lastName: 'Fatso', status: 'active' },
      permissions: ['manage_users', 'manage_schools'],
    });

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait afficher les données dès la réponse sans aucune interaction', () => {
    const el = fixture.nativeElement as HTMLElement;
    // Vérification des cartes stats
    expect(el.textContent).toContain('218');
    expect(el.textContent).toContain('Utilisateurs actifs');
    expect(el.textContent).toContain('Personnel');
    // Vérification du tableau
    expect(el.textContent).toContain('Essiane');
    expect(el.textContent).toContain('Paul');
    expect(el.textContent).toContain('paul.essiane@campusia.cm');
  });

  it('devrait afficher l état vide si la liste est vide', () => {
    vi.spyOn(usersApi, 'getUsers').mockReturnValue(of({ data: [], meta: { page: 1, limit: 10, total: 0 } }));
    component.loadUsers();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Aucun utilisateur pour le moment.');
  });

  it('devrait afficher l état de chargement pendant l appel', () => {
    component.loadingUsers.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.skeleton-row')).not.toBeNull();
  });

  it('devrait relancer l appel quand un filtre change et revenir à la page 1', () => {
    const spy = vi.spyOn(component as any, 'updateQueryParams');
    component.onRoleChange('staff');
    expect(component.selectedRole()).toBe('staff');
    expect(spy).toHaveBeenCalledWith({ role: 'staff', page: 1 });
  });

  it('ne devrait pas afficher les boutons d écriture en mode lecture seule (sans manage_users)', () => {
    sessionService.saveSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'u_reader', email: 'reader@campusia.cm', firstName: 'Simple', lastName: 'User', status: 'active' },
      permissions: [],
    });
    fixture.detectChanges();

    expect(component.canManageUsers).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.btn-add')).toBeNull();
  });

  it('devrait désactiver le bouton de suspension sur sa propre ligne', () => {
    // Si l'utilisateur connecté est u1
    sessionService.saveSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'paul.essiane@campusia.cm', firstName: 'Paul', lastName: 'Essiane', status: 'active' },
      permissions: ['manage_users'],
    });
    fixture.detectChanges();

    expect(component.currentUserId).toBe('u1');
    const el = fixture.nativeElement as HTMLElement;
    const actionsButtons = el.querySelectorAll('.action-btn');
    // Le bouton suspend/réactiver (dernier bouton) doit être disabled
    const suspendBtn = actionsButtons[actionsButtons.length - 1] as HTMLButtonElement;
    expect(suspendBtn.disabled).toBe(true);
  });
});

