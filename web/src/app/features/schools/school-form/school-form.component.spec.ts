import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { SchoolFormComponent } from './school-form.component';

describe('SchoolFormComponent', () => {
  let component: SchoolFormComponent;
  let fixture: ComponentFixture<SchoolFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SchoolFormComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('devrait valider les champs obligatoires et refuser la soumission si nom vide', () => {
    component.formData.name = '';
    component.formData.city = 'Yaoundé';
    const spy = vi.spyOn(component.formSubmit, 'emit');

    component.onSubmit();
    expect(component.errors.name).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('devrait invalider un domaine avec majuscules ou @', () => {
    component.formData.name = 'Institut Saint Jean';
    component.formData.city = 'Yaoundé';
    component.formData.googleWorkspaceDomain = 'INVALID@DOMAIN.COM';

    expect(component.validate()).toBe(false);
    expect(component.errors.domain).toBeTruthy();
  });

  it('devrait afficher l erreur 409 sous le champ Nom', () => {
    const error = new HttpErrorResponse({ status: 409 });
    component.handleApiError(error);

    expect(component.errors.name).toBe('Une école porte déjà ce nom.');
  });

  it('devrait afficher l erreur 400 dans le bandeau de la modale', () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: 'Nom invalide' } });
    component.handleApiError(error);

    expect(component.serverError).toBe('Nom invalide');
  });
});

