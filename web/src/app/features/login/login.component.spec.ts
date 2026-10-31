import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth.service';
import { AuthSessionData } from '../../core/session.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: {
    login: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  const mockSessionData: AuthSessionData = {
    accessToken: 'test-token',
    refreshToken: 'test-refresh',
    user: {
      id: '1',
      email: 'admin@campusia.com',
      firstName: 'Admin',
      lastName: 'Fatso',
      status: 'active',
    },
    permissions: ['manage_users'],
  };

  beforeEach(async () => {
    authServiceMock = {
      login: vi.fn(),
    };
    routerMock = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait afficher les textes exacts de la maquette', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Connexion');
    expect(compiled.textContent).toContain('Accès institutionnel');
    expect(compiled.textContent).toContain('Mot de passe oublié ?');
    expect(compiled.textContent).toContain('Se connecter');
    expect(compiled.textContent).toContain('Protocole sécurisé TLS 1.3');
    expect(compiled.textContent).toContain('Système académique connecté');
    expect(compiled.textContent).toContain('© 2026 CampusIA Technologies');

    const identifierInput = compiled.querySelector('input[name="identifier"]') as HTMLInputElement;
    const passwordInput = compiled.querySelector('input[name="password"]') as HTMLInputElement;

    expect(identifierInput.placeholder).toBe('Identifiant académique ou email');
    expect(passwordInput.placeholder).toBe('Mot de passe');
  });

  it('devrait valider les champs obligatoires et l email mal formé', () => {
    component.identifier = '';
    component.password = '';
    component.onSubmit();
    fixture.detectChanges();

    expect(component.identifierError()).toBe('Saisissez votre identifiant ou votre email.');
    expect(component.passwordError()).toBe('Saisissez votre mot de passe.');
    expect(authServiceMock.login).not.toHaveBeenCalled();

    // Email mal formé
    component.identifier = 'invalid-email@';
    component.password = 'password123';
    component.onSubmit();
    fixture.detectChanges();

    expect(component.identifierError()).toBe('Adresse email invalide.');
    expect(component.passwordError()).toBeNull();
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('devrait désactiver le bouton pendant l envoi et afficher "Connexion en cours…"', () => {
    authServiceMock.login.mockReturnValue(of(mockSessionData));

    component.identifier = 'admin@example.com';
    component.password = 'validpassword';

    component.isLoading.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const submitBtn = compiled.querySelector('.submit-btn') as HTMLButtonElement;

    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent?.trim()).toBe('Connexion en cours…');
  });

  it('devrait rediriger vers /schools après une connexion 200 réussie', () => {
    authServiceMock.login.mockReturnValue(of(mockSessionData));

    component.identifier = 'admin.fatso@example.com';
    component.password = 'mysecretpwd';

    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'admin.fatso@example.com',
      password: 'mysecretpwd',
    });
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/schools');
  });

  it('devrait afficher "Identifiant ou mot de passe incorrect." sur 401 et effacer le mot de passe', () => {
    authServiceMock.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { message: 'Identifiant ou mot de passe incorrect.' },
          }),
      ),
    );

    component.identifier = 'admin@example.com';
    component.password = 'wrongpwd';

    component.onSubmit();
    fixture.detectChanges();

    expect(component.globalError()).toBe('Identifiant ou mot de passe incorrect.');
    expect(component.password).toBe('');
    expect(component.identifier).toBe('admin@example.com');
  });

  it('devrait afficher "Trop de tentatives. Réessayez dans quelques minutes." sur 429', () => {
    authServiceMock.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { message: 'Too many requests' },
          }),
      ),
    );

    component.identifier = 'admin@example.com';
    component.password = 'wrongpwd';

    component.onSubmit();
    fixture.detectChanges();

    expect(component.globalError()).toBe(
      'Trop de tentatives. Réessayez dans quelques minutes.',
    );
    expect(component.password).toBe('');
  });

  it('devrait afficher une infobulle "Disponible prochainement" sur le clic d onglet institutionnel ou mot de passe oublié', () => {
    component.onTabClick('institutional');
    expect(component.institutionalTooltip()).toBe(true);

    const event = new MouseEvent('click');
    const preventSpy = vi.spyOn(event, 'preventDefault');
    component.onForgotPasswordClick(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(component.forgotPasswordTooltip()).toBe(true);
  });
});

