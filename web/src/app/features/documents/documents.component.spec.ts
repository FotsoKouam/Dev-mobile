import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { DocumentsComponent } from './documents.component';
import { DocumentsApiService } from '../../core/api/documents-api.service';
import { SpacesApiService } from '../../core/api/spaces-api.service';
import { SessionService } from '../../core/session.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { API_CONFIG } from '../../core/api.config';
import { DocumentItem, DocumentStats } from '../../core/api/models/document.model';

describe('DocumentsComponent', () => {
  let component: DocumentsComponent;
  let fixture: ComponentFixture<DocumentsComponent>;
  let documentsApiSpy: any;
  let spacesApiSpy: any;
  let sessionServiceSpy: any;
  let toastSpy: any;

  const mockStats: DocumentStats = {
    total: 12,
    available: 10,
    processing: 2,
    error: 0,
  };

  const mockDocuments: DocumentItem[] = [
    {
      id: 'doc-1',
      name: 'Cours_Graphes_Ch3.pdf',
      fileType: 'pdf',
      status: 'pending',
      version: 1,
      space: { id: 'sp-1', name: 'Graphes et algorithmes' },
      program: { id: 'prog-1', name: 'ISI' },
      school: { id: 'sch-1', name: 'Institut Saint Jean' },
      uploadedBy: { id: 'u-1', name: 'Essiane Paul' },
      sizeBytes: 2516582,
      createdAt: '2026-09-12T08:32:00.000Z',
      updatedAt: '2026-09-12T08:32:00.000Z',
    },
    {
      id: 'doc-2',
      name: 'Architecture_Web.pdf',
      fileType: 'pdf',
      status: 'available',
      version: 2,
      space: { id: 'sp-2', name: 'Architecture web' },
      program: { id: 'prog-1', name: 'ISI' },
      school: { id: 'sch-1', name: 'Institut Saint Jean' },
      uploadedBy: { id: 'u-2', name: 'Mbarga Pierre' },
      sizeBytes: 1548200,
      createdAt: '2026-09-10T14:22:00.000Z',
      updatedAt: '2026-09-10T14:22:00.000Z',
    },
  ];

  beforeEach(async () => {
    documentsApiSpy = {
      getStats: vi.fn().mockReturnValue(of(mockStats)),
      getDocuments: vi.fn().mockReturnValue(
        of({
          data: mockDocuments,
          meta: { page: 1, limit: 10, total: 2 },
        }),
      ),
      getDocument: vi.fn().mockImplementation((id: string) =>
        of(mockDocuments.find((d) => d.id === id) || mockDocuments[0]),
      ),
      uploadDocument: vi.fn(),
    };

    spacesApiSpy = {
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
          data: [
            { id: 'sp-1', name: 'Graphes et algorithmes', status: 'active' },
            { id: 'sp-2', name: 'Architecture web', status: 'active' },
          ],
          meta: { page: 1, limit: 100, total: 2 },
        }),
      ),
      createSpace: vi.fn(),
      updateSpace: vi.fn(),
    };

    sessionServiceSpy = {
      hasPermission: vi.fn((perm: string) => {
        if (perm === 'manage_spaces') return true;
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
        { provide: DocumentsApiService, useValue: documentsApiSpy },
        { provide: SpacesApiService, useValue: spacesApiSpy },
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

  it('devrait être créé et charger les statistiques et les documents sans clic', () => {
    expect(component).toBeTruthy();
    expect(documentsApiSpy.getStats).toHaveBeenCalled();
    expect(documentsApiSpy.getDocuments).toHaveBeenCalled();
    expect(component.documents().length).toBe(2);
    expect(component.stats()).toEqual(mockStats);
  });

  it('les 4 cartes de statistiques affichent les vraies valeurs retournées par getStats', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const statCards = compiled.querySelectorAll('app-stat-card');
    expect(statCards.length).toBe(4);
    expect(statCards[0].textContent).toContain('12'); // total
    expect(statCards[1].textContent).toContain('10'); // available
    expect(statCards[2].textContent).toContain('2');  // processing
    expect(statCards[3].textContent).toContain('0');  // error
  });

  it('le tableau affiche les lignes réelles retournées par res.data', () => {
    component.ngAfterViewInit();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cours_Graphes_Ch3.pdf');
    expect(compiled.textContent).toContain('Architecture_Web.pdf');
  });

  it('affiche l état vide "Aucun document pour le moment." si res.data est vide', () => {
    documentsApiSpy.getDocuments.mockReturnValue(
      of({ data: [], meta: { page: 1, limit: 10, total: 0 } }),
    );
    component.loadDocuments();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(component.i18n.documentsPage.table.emptyReal);
  });

  it('le filtre Type déclenche un appel avec fileType et revient à la page 1', () => {
    component.onFileTypeFilterChange('pdf');
    expect(component.selectedFileType()).toBe('pdf');
    expect(component.currentPage()).toBe(1);
    expect(documentsApiSpy.getDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        fileType: 'pdf',
        page: 1,
      }),
    );
  });

  it('le filtre Statut déclenche un appel avec status', () => {
    component.onStatusFilterChange('pending');
    expect(component.selectedStatus()).toBe('pending');
    expect(documentsApiSpy.getDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        page: 1,
      }),
    );
  });

  it('le changement de filtre École charge les filières et recharge documents et statistiques', () => {
    component.onSchoolFilterChange('sch-1');
    expect(component.selectedSchoolId()).toBe('sch-1');
    expect(spacesApiSpy.getSchoolPrograms).toHaveBeenCalledWith('sch-1');
    expect(spacesApiSpy.getSpaces).toHaveBeenCalledWith({ schoolId: 'sch-1', limit: 100 });
    expect(documentsApiSpy.getDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'sch-1',
      }),
    );
    expect(documentsApiSpy.getStats).toHaveBeenCalledWith('sch-1', undefined);
  });

  it('le filtre Espace est actif dès l école choisie et liste tous les espaces de l école', async () => {
    component.onSchoolFilterChange('sch-1');
    expect(spacesApiSpy.getSpaces).toHaveBeenCalledWith({ schoolId: 'sch-1', limit: 100 });
    expect(component.spaces().length).toBe(2);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const selects = compiled.querySelectorAll('select.filter-select');
    // selects: [0] Ecole, [1] Filière, [2] Espace
    const spaceSelect = selects[2] as HTMLSelectElement;
    expect(spaceSelect.disabled).toBe(false);
  });

  it('un clic sur une ligne ouvre le panneau de détail avec getDocument', () => {
    component.openDocumentDetail(mockDocuments[0]);
    expect(documentsApiSpy.getDocument).toHaveBeenCalledWith('doc-1');
    expect(component.isDetailPanelOpen()).toBe(true);
    expect(component.selectedDocument()?.id).toBe('doc-1');
  });
});
