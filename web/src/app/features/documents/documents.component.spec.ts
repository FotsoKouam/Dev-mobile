import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { DocumentsComponent } from './documents.component';
import { SpacesApiService } from '../../core/api/spaces-api.service';
import { SessionService } from '../../core/session.service';
import { API_CONFIG } from '../../core/api.config';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Space } from '../../core/api/models/space.model';

describe('DocumentsComponent', () => {
  let component: DocumentsComponent;
  let fixture: ComponentFixture<DocumentsComponent>;
  let apiSpy: any;
  let sessionServiceSpy: any;
  let toastSpy: any;

  const mockSpaces: Space[] = [
    {
      id: 'sp-1',
      name: 'Graphes et algorithmes',
      description: null,
      type: 'institutional',
      status: 'active',
      school: { id: 'sch-1', name: 'Institut Saint Jean' },
      program: { id: 'prog-1', name: 'ISI' },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'sp-2',
      name: 'Architecture web avancée',
      description: null,
      type: 'institutional',
      status: 'active',
      school: { id: 'sch-1', name: 'Institut Saint Jean' },
      program: { id: 'prog-1', name: 'ISI' },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  beforeEach(async () => {
    apiSpy = {
      getSchools: vi.fn().mockReturnValue(
        of({
          data: [{ id: 'sch-1', name: 'Institut Saint Jean' }],
          meta: { page: 1, limit: 100, total: 1 },
        }),
      ),
      getSchoolPrograms: vi.fn().mockReturnValue(
        of({
          data: [
            { id: 'prog-0', name: 'Gestion' },
            { id: 'prog-1', name: 'ISI' },
            { id: 'prog-2', name: 'SRT' },
          ],
          meta: { page: 1, limit: 50, total: 3 },
        }),
      ),
      getSpaces: vi.fn().mockReturnValue(
        of({
          data: mockSpaces,
          meta: { page: 1, limit: 100, total: 2 },
        }),
      ),
      createSpace: vi.fn(),
      updateSpace: vi.fn(),
    };

    sessionServiceSpy = {
      hasPermission: vi.fn((perm: string) => {
        if (perm === 'create_institutional_space') return true;
        if (perm === 'add_document') return true;
        if (perm === 'manage_programs') return true;
        return false;
      }),
      user: vi.fn().mockReturnValue({ id: 'u-1', email: 'admin@campusia.cm' }),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    toastSpy = {
      success: vi.fn(),
      toasts: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [DocumentsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://api.test' } },
        { provide: SpacesApiService, useValue: apiSpy },
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

    fixture = TestBed.createComponent(DocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé et charger les écoles sans clic', () => {
    expect(component).toBeTruthy();
    expect(apiSpy.getSchools).toHaveBeenCalledWith(100);
    expect(component.schools().length).toBe(1);
  });

  it('les 4 cartes de statistiques doivent afficher "—" sans appel réseau', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const statCards = compiled.querySelectorAll('app-stat-card');
    expect(statCards.length).toBe(4);

    statCards.forEach((card) => {
      expect(card.textContent).toContain('—');
    });
  });

  it('le tableau doit afficher l état vide explicite et aucune ligne factice', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(0);

    const emptyState = compiled.querySelector('app-empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain(
      component.i18n.documentsPage.table.emptyWaiting,
    );
  });

  it('le changement de filtre École doit charger les filières sans clic', () => {
    component.onSchoolFilterChange('sch-1');
    fixture.detectChanges();

    expect(component.selectedSchoolId()).toBe('sch-1');
    expect(component.selectedProgramId()).toBe('');
    expect(component.selectedSpaceId()).toBe('');
    expect(apiSpy.getSchoolPrograms).toHaveBeenCalledWith('sch-1');
    expect(component.programs().length).toBe(3);

    const compiled = fixture.nativeElement as HTMLElement;
    const programSelect = compiled.querySelectorAll('select')[1];
    expect(programSelect).toBeTruthy();
    const options = Array.from(programSelect.querySelectorAll('option')).map(
      (opt) => opt.textContent?.trim(),
    );
    expect(options).toContain('Toutes les filières');
    expect(options).toContain('Gestion');
    expect(options).toContain('ISI');
    expect(options).toContain('SRT');
  });

  it('le changement de filtre Filière doit charger les espaces sans clic', () => {
    component.selectedSchoolId.set('sch-1');
    component.onProgramFilterChange('prog-1');
    expect(component.selectedProgramId()).toBe('prog-1');
    expect(component.selectedSpaceId()).toBe('');
    expect(apiSpy.getSpaces).toHaveBeenCalledWith({
      programId: 'prog-1',
      schoolId: 'sch-1',
      limit: 100,
    });
    expect(component.spaces().length).toBe(2);
  });

  it('le changement d École doit réinitialiser la filière et l espace', () => {
    component.selectedSchoolId.set('sch-1');
    component.selectedProgramId.set('prog-1');
    component.selectedSpaceId.set('sp-1');
    component.spaces.set(mockSpaces);

    component.onSchoolFilterChange('sch-2');

    expect(component.selectedSchoolId()).toBe('sch-2');
    expect(component.selectedProgramId()).toBe('');
    expect(component.selectedSpaceId()).toBe('');
    expect(component.spaces().length).toBe(0);
  });

  it('le bouton "+ Créer un espace institutionnel" doit être masqué sans la permission create_institutional_space', () => {
    sessionServiceSpy.hasPermission.mockImplementation((perm: string) => {
      if (perm === 'create_institutional_space') return false;
      return true;
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    let hasCreateSpaceBtn = false;
    buttons.forEach((btn) => {
      if (btn.textContent?.includes(component.i18n.documentsPage.actions.createSpace)) {
        hasCreateSpaceBtn = true;
      }
    });

    expect(hasCreateSpaceBtn).toBe(false);
  });
});

