import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormFieldComponent } from './form-field.component';

describe('FormFieldComponent', () => {
  let component: FormFieldComponent;
  let fixture: ComponentFixture<FormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFieldComponent);
    component = fixture.componentInstance;
    component.label = 'Nom de l’école';
    component.fieldId = 'school-name';
    component.error = null;
    fixture.detectChanges();
  });

  it('devrait afficher le label', () => {
    expect(fixture.nativeElement.textContent).toContain('Nom de l’école');
  });

  it('devrait afficher l’erreur si présente', () => {
    const errFixture = TestBed.createComponent(FormFieldComponent);
    const errComp = errFixture.componentInstance;
    errComp.label = 'Nom de l’école';
    errComp.error = 'Champ obligatoire';
    errFixture.detectChanges();

    expect(errFixture.nativeElement.textContent).toContain('Champ obligatoire');
  });
});
