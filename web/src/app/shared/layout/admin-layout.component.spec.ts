import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';
import { SessionService } from '../../core/session.service';
import { API_CONFIG } from '../../core/api.config';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;
  let sessionService: SessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        SessionService,
        { provide: API_CONFIG, useValue: { apiUrl: 'https://test.api' } },
      ],
    }).compileComponents();

    sessionService = TestBed.inject(SessionService);
    sessionService.saveSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { id: 'u1', email: 'admin@campusia.com', firstName: 'Jean', lastName: 'Pierre', status: 'active' },
      permissions: ['manage_schools', 'manage_users'],
    });

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    component.pageTitle = 'Titre test';
    component.pageSubtitle = 'Sous-titre test';
    fixture.detectChanges();
  });

  it('devrait afficher le titre et le nom d utilisateur', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Titre test');
    expect(el.textContent).toContain('Jean Pierre');
  });

  it('devrait afficher seulement les liens autorisés par les permissions', () => {
    expect(component.canAccessSchools).toBe(true);
    expect(component.canAccessUsers).toBe(true);
    expect(component.canAccessRoles).toBe(false);
  });
});

