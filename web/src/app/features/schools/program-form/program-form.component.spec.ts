import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ProgramFormComponent } from './program-form.component';

describe('ProgramFormComponent', () => {
  let component: ProgramFormComponent;
  let fixture: ComponentFixture<ProgramFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgramFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgramFormComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('devrait exiger le nom de la filière', () => {
    component.formData.name = '';
    const spy = vi.spyOn(component.formSubmit, 'emit');

    component.onSubmit();
    expect(component.errors.name).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('devrait afficher l erreur 409 sous le champ Nom', () => {
    const error = new HttpErrorResponse({ status: 409 });
    component.handleApiError(error);

    expect(component.errors.name).toBe('Cette filière existe déjà dans cette école.');
  });
});

