import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { RoleFormComponent } from './role-form.component';

describe('RoleFormComponent', () => {
  let component: RoleFormComponent;
  let fixture: ComponentFixture<RoleFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait refuser la soumission si les champs obligatoires sont vides', () => {
    component.isOpen = true;
    component.formData.name = '';
    component.formData.code = '';

    const spy = vi.spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(spy).not.toHaveBeenCalled();
    expect(component.errors.name).toBeDefined();
    expect(component.errors.code).toBeDefined();
  });

  it('devrait rejeter un format de code non snake_case', () => {
    component.isOpen = true;
    component.formData.name = 'Responsable';
    component.formData.code = 'INVALID CODE!';

    component.onSubmit();

    expect(component.errors.code).toContain('snake_case');
  });

  it('devrait positionner l erreur 409 sous le champ Code', () => {
    const error409 = new HttpErrorResponse({
      status: 409,
      statusText: 'Conflict',
      error: { message: 'Un rôle avec ce code existe déjà.' },
    });

    component.handleApiError(error409);

    expect(component.errors.code).toBe('Un rôle utilise déjà ce code ou ce nom.');
  });

  it('devrait afficher l erreur 400 dans le bandeau de la modale', () => {
    const error400 = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { message: 'Données invalides fournies.' },
    });

    component.handleApiError(error400);

    expect(component.serverError).toBe('Données invalides fournies.');
  });
});

