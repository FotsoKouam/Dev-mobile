import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { AssignmentFormComponent } from './assignment-form.component';
import { AssignmentsApiService } from '../../../core/api/assignments-api.service';

describe('AssignmentFormComponent', () => {
  let component: AssignmentFormComponent;
  let fixture: ComponentFixture<AssignmentFormComponent>;
  let apiSpy: any;

  beforeEach(async () => {
    apiSpy = {
      searchUsers: vi.fn().mockReturnValue(of({ data: [], meta: { page: 1, limit: 10, total: 0 } })),
      getSchoolPrograms: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [AssignmentFormComponent],
      providers: [{ provide: AssignmentsApiService, useValue: apiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentFormComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait refuser la soumission si les champs obligatoires sont vides', () => {
    component.selectedUser = null;
    component.selectedRoleCode = '';

    const submitSpy = vi.spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(submitSpy).not.toHaveBeenCalled();
    expect(component.errors.user).toBeDefined();
    expect(component.errors.role).toBeDefined();
  });

  it('devrait exiger école et filière pour le rôle staff', () => {
    component.selectedUser = {
      id: 'u1',
      firstName: 'Paul',
      lastName: 'Essiane',
      email: 'paul@campusia.cm',
      phone: null,
      lastLoginAt: null,
      assignments: [],
      authMethod: 'google',
      status: 'active',
      createdAt: '',
      updatedAt: '',
    };
    component.selectedRoleCode = 'staff';
    component.selectedSchoolId = '';
    component.selectedProgramId = '';

    const submitSpy = vi.spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(submitSpy).not.toHaveBeenCalled();
    expect(component.errors.school).toBeDefined();
    expect(component.errors.program).toBeDefined();
  });

  it('devrait positionner le message de doublon 409 dans le bandeau de la fenêtre', () => {
    const error409 = new HttpErrorResponse({
      status: 409,
      statusText: 'Conflict',
      error: { message: 'An identical assignment already exists for this user' },
    });

    component.handleApiError(error409);
    expect(component.serverError).toBe('Cette affectation existe déjà.');
  });

  it('devrait afficher le message d erreur du serveur pour un 400', () => {
    const error400 = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { message: 'Incohérence rôle / école / filière' },
    });

    component.handleApiError(error400);
    expect(component.serverError).toBe('Incohérence rôle / école / filière');
  });
});
