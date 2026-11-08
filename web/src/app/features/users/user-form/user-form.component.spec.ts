import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { UserFormComponent } from './user-form.component';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { API_CONFIG } from '../../../core/api.config';
import { User } from '../../../core/api/models/user.model';
import { School } from '../../../core/api/models/school.model';

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let schoolsApi: SchoolsApiService;

  const mockSchools: School[] = [
    {
      id: 's1',
      name: 'Institut Saint Jean',
      type: 'private',
      city: 'Yaoundé',
      status: 'active',
      programsCount: 1,
      usersCount: 0,
      spacesCount: 0,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFormComponent],
      providers: [
        SchoolsApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://test.api' } },
      ],
    }).compileComponents();

    schoolsApi = TestBed.inject(SchoolsApiService);
    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    component.schools = mockSchools;
    fixture.detectChanges();
  });

  it('devrait refuser la soumission si les champs obligatoires sont vides', () => {
    component.isOpen = true;
    component.formData.firstName = '';
    component.formData.lastName = '';
    component.formData.email = '';

    const spy = vi.spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(spy).not.toHaveBeenCalled();
    expect(component.errors.firstName).toBeDefined();
    expect(component.errors.lastName).toBeDefined();
    expect(component.errors.email).toBeDefined();
  });

  it('devrait rejeter un format d email invalide', () => {
    component.isOpen = true;
    component.formData.firstName = 'Paul';
    component.formData.lastName = 'Essiane';
    component.formData.email = 'format-invalide';
    component.formData.roleCode = 'platform_admin';

    component.onSubmit();

    expect(component.errors.email).toContain('valide');
  });

  it('devrait positionner l erreur 409 sous le champ Email', () => {
    const error409 = new HttpErrorResponse({
      status: 409,
      statusText: 'Conflict',
      error: { message: 'Un utilisateur avec cet email existe déjà.' },
    });

    component.handleApiError(error409);

    expect(component.errors.email).toBe('Un compte utilise déjà cet email.');
  });

  it('devrait afficher l erreur 400 dans le bandeau de la fenêtre', () => {
    const error400 = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { message: 'Données invalides fournies.' },
    });

    component.handleApiError(error400);

    expect(component.serverError).toBe('Données invalides fournies.');
  });
});

