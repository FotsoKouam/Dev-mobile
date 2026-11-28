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
          scope: 'program',
          scopeProgramId: 'prog-1',
          scopeProgram: { id: 'prog-1', name: 'ISI' },
          status: 'active',
          school: { id: 'sch-1', name: 'Institut Saint Jean' },
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

  it('le champ filière n apparaît qu avec la portée Filière', () => {
    component.isOpen = true;
    component.onSchoolChange('sch-1');
    component.onScopeChange('school');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('select[name="programId"]')).toBeNull();

    component.onScopeChange('program');
    fixture.detectChanges();
    expect(compiled.querySelector('select[name="programId"]')).not.toBeNull();
  });

  it('le champ rôle n apparaît qu avec la portée Rôle', () => {
    component.isOpen = true;
    component.onSchoolChange('sch-1');
    component.onScopeChange('school');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('select[name="roleCode"]')).toBeNull();

    component.onScopeChange('role');
    fixture.detectChanges();
    expect(compiled.querySelector('select[name="roleCode"]')).not.toBeNull();
  });

  it('aucun champ supplémentaire pour les portées École et Individuel', () => {
    component.isOpen = true;
    component.onSchoolChange('sch-1');

    component.onScopeChange('school');
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('select[name="programId"]')).toBeNull();
    expect(compiled.querySelector('select[name="roleCode"]')).toBeNull();

    component.onScopeChange('individual');
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('select[name="programId"]')).toBeNull();
    expect(compiled.querySelector('select[name="roleCode"]')).toBeNull();
  });

  it('changer de portée réinitialise la cible', () => {
    component.isOpen = true;
    component.onScopeChange('program');
    component.onProgramChange('prog-1');
    expect(component.selectedProgramId()).toBe('prog-1');

    component.onScopeChange('role');
    expect(component.selectedProgramId()).toBe('');
    expect(component.selectedRoleCode()).toBe('');

    component.onRoleChange('staff');
    expect(component.selectedRoleCode()).toBe('staff');

    component.onScopeChange('school');
    expect(component.selectedRoleCode()).toBe('');
  });

  it('affiche le message 409 sous le champ Nom en cas de conflit', () => {
    apiSpy.createSpace.mockReturnValueOnce(
      throwError(() => ({
        status: 409,
        error: { message: 'A space with name already exists in this school' },
      })),
    );

    component.isOpen = true;
    component.selectedSchoolId.set('sch-1');
    component.name.set('Graphes et algorithmes');
    component.selectedScope.set('school');

    component.onSubmit();
    fixture.detectChanges();

    expect(component.nameError()).toBe('Un espace porte déjà ce nom dans cette école.');
  });
});
