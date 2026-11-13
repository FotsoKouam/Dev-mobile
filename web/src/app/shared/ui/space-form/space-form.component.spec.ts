import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { SpaceFormComponent } from './space-form.component';
import { SpacesApiService } from '../../../core/api/spaces-api.service';
import { ToastService } from '../toast/toast.service';
import { API_CONFIG } from '../../../core/api.config';
import { Space } from '../../../core/api/models/space.model';

describe('SpaceFormComponent', () => {
  let component: SpaceFormComponent;
  let fixture: ComponentFixture<SpaceFormComponent>;
  let apiSpy: any;
  let toastSpy: any;

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
      createSpace: vi.fn().mockReturnValue(
        of({
          id: 'sp-1',
          name: 'Graphes et algorithmes',
          description: null,
          type: 'institutional',
          status: 'active',
          school: { id: 'sch-1', name: 'Institut Saint Jean' },
          program: { id: 'prog-1', name: 'ISI' },
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        } as Space),
      ),
      updateSpace: vi.fn().mockReturnValue(
        of({
          id: 'sp-1',
          name: 'Graphes et algorithmes modifiés',
          status: 'active',
        } as Space),
      ),
    };

    toastSpy = {
      success: vi.fn(),
      toasts: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [SpaceFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://api.test' } },
        { provide: SpacesApiService, useValue: apiSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpaceFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé et charger les écoles', () => {
    expect(component).toBeTruthy();
    expect(apiSpy.getSchools).toHaveBeenCalledWith(100);
    expect(component.schools().length).toBe(1);
  });

  it('devrait charger et afficher les filières dans le select filière quand une école est choisie', () => {
    component.isOpen = true;
    fixture.detectChanges();

    component.onSchoolChange('sch-1');
    fixture.detectChanges();

    expect(apiSpy.getSchoolPrograms).toHaveBeenCalledWith('sch-1');
    expect(component.programs().length).toBe(3);

    const compiled = fixture.nativeElement as HTMLElement;
    const selects = compiled.querySelectorAll('select');
    expect(selects.length).toBeGreaterThanOrEqual(2);
    const programSelect = selects[1];
    const options = Array.from(programSelect.querySelectorAll('option')).map(
      (opt) => opt.textContent?.trim(),
    );
    expect(options).toContain('Gestion');
    expect(options).toContain('ISI');
    expect(options).toContain('SRT');
  });

  it('devrait refuser la soumission si l école ou la filière sont absentes', () => {
    component.isOpen = true;
    component.name.set('Mon Espace');

    component.onSubmit();

    expect(component.schoolError()).toBeTruthy();
    expect(component.programError()).toBeTruthy();
    expect(apiSpy.createSpace).not.toHaveBeenCalled();
  });

  it('devrait refuser la soumission si le nom a moins de 2 caractères', () => {
    component.isOpen = true;
    component.selectedSchoolId.set('sch-1');
    component.selectedProgramId.set('prog-1');
    component.name.set('A');

    component.onSubmit();

    expect(component.nameError()).toBeTruthy();
    expect(apiSpy.createSpace).not.toHaveBeenCalled();
  });

  it('devrait envoyer le corps strict sans type ni programId à la création', () => {
    component.isOpen = true;
    component.selectedSchoolId.set('sch-1');
    component.selectedProgramId.set('prog-1');
    component.name.set('Graphes et algorithmes');
    component.description.set('Algo');

    component.onSubmit();

    expect(apiSpy.createSpace).toHaveBeenCalledWith('prog-1', {
      name: 'Graphes et algorithmes',
      description: 'Algo',
    });
    // Vérifier l'absence de type et programId dans l'argument envoyé
    const payload = apiSpy.createSpace.mock.calls[0][1];
    expect(payload.type).toBeUndefined();
    expect(payload.programId).toBeUndefined();
    expect(toastSpy.success).toHaveBeenCalled();
  });

  it('devrait afficher l erreur 409 sous le champ Nom', () => {
    apiSpy.createSpace.mockReturnValueOnce(
      throwError(() => ({
        status: 409,
        error: { message: 'A space with name already exists' },
      })),
    );

    component.isOpen = true;
    component.selectedSchoolId.set('sch-1');
    component.selectedProgramId.set('prog-1');
    component.name.set('Graphes et algorithmes');

    component.onSubmit();

    expect(component.nameError()).toBe(component.i18n.spaceForm.errors.conflictName);
  });

  it('devrait afficher l erreur 400 dans le bandeau de la fenêtre', () => {
    apiSpy.createSpace.mockReturnValueOnce(
      throwError(() => ({
        status: 400,
        error: { message: 'Erreur de validation serveur' },
      })),
    );

    component.isOpen = true;
    component.selectedSchoolId.set('sch-1');
    component.selectedProgramId.set('prog-1');
    component.name.set('Graphes et algorithmes');

    component.onSubmit();

    expect(component.serverError()).toBe('Erreur de validation serveur');
  });
});

