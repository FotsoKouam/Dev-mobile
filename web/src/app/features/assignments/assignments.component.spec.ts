import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AssignmentsComponent } from './assignments.component';
import { AssignmentsApiService } from '../../core/api/assignments-api.service';
import { SessionService } from '../../core/session.service';
import { API_CONFIG } from '../../core/api.config';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Assignment } from '../../core/api/models/assignment.model';

describe('AssignmentsComponent', () => {
  let component: AssignmentsComponent;
  let fixture: ComponentFixture<AssignmentsComponent>;
  let apiSpy: any;
  let sessionServiceSpy: any;
  let toastSpy: any;

  const mockAssignments: Assignment[] = [
    {
      id: 'a1',
      user: { id: 'u1', firstName: 'Paul', lastName: 'Essiane', email: 'paul@campusia.cm' },
      role: { id: 'r1', code: 'staff', name: 'Personnel' },
      school: { id: 's1', name: 'Saint Jean' },
      program: { id: 'p1', name: 'ISI' },
      status: 'active',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'a2',
      user: { id: 'u2', firstName: 'Jean Pierre', lastName: 'Mbarga', email: 'jean@campusia.cm' },
      role: { id: 'r2', code: 'school_admin', name: 'Administrateur école' },
      school: { id: 's1', name: 'Saint Jean' },
      program: null,
      status: 'active',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  beforeEach(async () => {
    apiSpy = {
      getAssignments: vi.fn().mockReturnValue(
        of({
          data: mockAssignments,
          meta: { page: 1, limit: 10, total: 2 },
        })
      ),
      getAssignment: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      deactivateAssignment: vi.fn(),
      getStats: vi.fn().mockReturnValue(
        of({
          total: 2,
          users: 2,
          schools: 1,
          programs: 1,
        })
      ),
      getSchools: vi.fn().mockReturnValue(
        of({
          data: [{ id: 's1', name: 'Saint Jean' }],
          meta: { page: 1, limit: 100, total: 1 },
        })
      ),
      getSchoolPrograms: vi.fn().mockReturnValue(
        of([{ id: 'p1', name: 'ISI' }])
      ),
      searchUsers: vi.fn().mockReturnValue(of({ data: [], meta: { page: 1, limit: 10, total: 0 } })),
      getUser: vi.fn().mockReturnValue(of({ id: 'u1', assignments: [] })),
    };

    sessionServiceSpy = {
      hasPermission: vi.fn().mockReturnValue(true),
      user: vi.fn().mockReturnValue({ id: 'u-session', firstName: 'Fatso', lastName: 'Admin' }),
      currentUser: vi.fn().mockReturnValue({ id: 'u-session', firstName: 'Fatso', lastName: 'Admin' }),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    toastSpy = {
      success: vi.fn(),
      toasts: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [AssignmentsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://test.api' } },
        { provide: AssignmentsApiService, useValue: apiSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentsComponent);
    component = fixture.componentInstance;
  });

  it('devrait charger les affectations et statistiques dès la réponse sans clic', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(apiSpy.getAssignments).toHaveBeenCalled();
    expect(apiSpy.getStats).toHaveBeenCalled();
    expect(component.assignments().length).toBe(2);
    expect(component.stats()?.total).toBe(2);
    expect(component.stats()?.users).toBe(2);
    expect(component.loadingAssignments()).toBe(false);
  });

  it('le changement de filtre école doit recharger et revenir à la page 1', () => {
    fixture.detectChanges();

    component.onSchoolFilterChange('s1');
    expect(component.selectedSchoolId()).toBe('s1');
    expect(component.selectedProgramId()).toBe('');
    expect(component.currentPage()).toBe(1);
    expect(apiSpy.getSchoolPrograms).toHaveBeenCalledWith('s1');
  });

  it('le filtre filière doit être désactivé sans école choisie', async () => {
    component.selectedSchoolId.set('');
    fixture.detectChanges();
    await fixture.whenStable();

    const selectEl = fixture.nativeElement.querySelector('select[aria-label="Filtrer par filière"]') as HTMLSelectElement;
    expect(component.selectedSchoolId()).toBe('');
    expect(selectEl.disabled).toBe(true);
  });

  it('devrait désactiver le bouton de retrait sur sa propre affectation d administrateur', () => {
    sessionServiceSpy.user.mockReturnValue({ id: 'u2' });
    fixture.detectChanges();

    expect(component.isSelfAdmin(mockAssignments[1])).toBe(true);
    expect(component.isSelfAdmin(mockAssignments[0])).toBe(false);
  });

  it('devrait ouvrir et fermer le panneau de détail', () => {
    fixture.detectChanges();

    component.openDetail(mockAssignments[0]);
    expect(component.isDetailOpen()).toBe(true);
    expect(component.detailAssignment()?.id).toBe('a1');

    component.closeDetail();
    expect(component.isDetailOpen()).toBe(false);
    expect(component.detailAssignment()).toBeNull();
  });

  it('devrait désactiver la création sans la permission manage_assignments', () => {
    sessionServiceSpy.hasPermission.mockReturnValue(false);
    fixture.detectChanges();

    expect(component.canManageAssignments).toBe(false);
    const newBtn = fixture.nativeElement.querySelector('.btn-primary');
    expect(newBtn).toBeNull();
  });

  it('devrait afficher l état d erreur réseau en cas d échec API', () => {
    apiSpy.getAssignments.mockReturnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();

    expect(component.errorAssignments()).toBe(true);
    expect(component.loadingAssignments()).toBe(false);
  });
});

