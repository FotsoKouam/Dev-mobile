import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { SchoolDetailComponent } from './school-detail.component';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { SpacesApiService } from '../../../core/api/spaces-api.service';
import { SessionService } from '../../../core/session.service';
import { API_CONFIG } from '../../../core/api.config';
import { School } from '../../../core/api/models/school.model';
import { Space } from '../../../core/api/models/space.model';

describe('SchoolDetailComponent', () => {
  let component: SchoolDetailComponent;
  let fixture: ComponentFixture<SchoolDetailComponent>;
  let api: SchoolsApiService;
  let spacesApi: SpacesApiService;

  const mockSchool: School = {
    id: 's1',
    name: 'Institut Saint Jean',
    type: 'private',
    city: 'Yaoundé',
    status: 'active',
    programsCount: 3,
    usersCount: 0,
    spacesCount: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolDetailComponent],
      providers: [
        SchoolsApiService,
        SpacesApiService,
        SessionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://test.api' } },
      ],
    }).compileComponents();

    api = TestBed.inject(SchoolsApiService);
    spacesApi = TestBed.inject(SpacesApiService);
    fixture = TestBed.createComponent(SchoolDetailComponent);
    component = fixture.componentInstance;
    component.school = mockSchool;
    component.isOpen = true;
    component.activeTab = 'info';
    component.canManageSchools = true;
    component.canManagePrograms = true;
    fixture.detectChanges();
  });

  it('devrait afficher la liste des filières après la réponse sans interaction utilisateur', () => {
    const mockPrograms = {
      data: [
        { id: 'p1', schoolId: 's1', name: 'ISI', status: 'active' as const, usersCount: 62, spacesCount: 4, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 'p2', schoolId: 's1', name: 'SRT', status: 'active' as const, usersCount: 42, spacesCount: 3, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 'p3', schoolId: 's1', name: 'Gestion', status: 'active' as const, usersCount: 16, spacesCount: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
      meta: { page: 1, limit: 50, total: 3 },
    };
    vi.spyOn(api, 'getPrograms').mockReturnValue(of(mockPrograms));

    component.selectTab('programs');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ISI');
    expect(el.textContent).toContain('SRT');
    expect(el.textContent).toContain('Gestion');
    expect(el.textContent).not.toContain('Chargement des filières…');
  });

  it('devrait basculer entre les onglets', () => {
    const tabSpy = vi.spyOn(component.tabChange, 'emit');
    component.selectTab('programs');

    expect(component.activeTab).toBe('programs');
    expect(tabSpy).toHaveBeenCalledWith('programs');
  });

  it('ne devrait faire aucun appel API sur l onglet Utilisateurs', () => {
    const apiSpy = vi.spyOn(api, 'getPrograms');
    const spacesSpy = vi.spyOn(spacesApi, 'getSpaces');
    component.selectTab('users');

    expect(apiSpy).not.toHaveBeenCalled();
    expect(spacesSpy).not.toHaveBeenCalled();
  });

  it('devrait charger les espaces sans clic quand l onglet Espaces est sélectionné', () => {
    const mockSpacesPage = {
      data: [
        {
          id: 'sp-1',
          name: 'Algorithmique & Structures de données',
          description: 'Support cours',
          type: 'institutional' as const,
          status: 'active' as const,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          program: { id: 'p1', name: 'ISI' },
        },
      ],
      meta: { page: 1, limit: 50, total: 1 },
    };
    vi.spyOn(spacesApi, 'getSpaces').mockReturnValue(of(mockSpacesPage as any));

    component.selectTab('spaces');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Algorithmique & Structures de données');
    expect(el.textContent).toContain('ISI');
    expect(el.textContent).toContain('— documents');
  });

  it('devrait afficher l état vide si aucun espace n est trouvé pour l école', () => {
    vi.spyOn(spacesApi, 'getSpaces').mockReturnValue(of({ data: [], meta: { page: 1, limit: 50, total: 0 } } as any));

    component.selectTab('spaces');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Aucun espace institutionnel pour cette école.');
  });

  it('devrait demander confirmation avant de désactiver l école', () => {
    const event = { target: { checked: false } } as unknown as Event;
    component.onStatusToggleChange(event);

    expect(component.showDeactivateConfirm()).toBe(true);

    const statusSpy = vi.spyOn(component.statusChange, 'emit');
    component.confirmDeactivate();

    expect(statusSpy).toHaveBeenCalledWith({ id: 's1', status: 'inactive' });
  });
});

