import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserDetailComponent } from './user-detail.component';
import { User } from '../../../core/api/models/user.model';

describe('UserDetailComponent', () => {
  let component: UserDetailComponent;
  let fixture: ComponentFixture<UserDetailComponent>;

  const mockUser: User = {
    id: 'u1',
    email: 'paul.essiane@campusia.cm',
    firstName: 'Paul',
    lastName: 'Essiane',
    phone: '+237 6 12 34 56 78',
    authMethod: 'google',
    status: 'active',
    lastLoginAt: '2026-09-10T10:28:00.000Z',
    assignments: [
      {
        id: 'a1',
        role: { id: 'r1', code: 'staff', name: 'Personnel' },
        school: { id: 's1', name: 'Institut Saint Jean' },
        program: { id: 'p1', name: 'ISI' },
        status: 'active',
      },
    ],
    createdAt: '2026-06-05T14:20:00.000Z',
    updatedAt: '2026-06-05T14:20:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    component.user = mockUser;
    component.isOpen = true;
    component.activeTab = 'informations';
    component.canManageUsers = true;
    component.ngOnChanges({
      user: {
        currentValue: mockUser,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    fixture.detectChanges();
  });

  it('devrait afficher les informations personnelles de l utilisateur', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Essiane');
    expect(el.textContent).toContain('Paul');
    expect(el.textContent).toContain('paul.essiane@campusia.cm');
  });

  it('devrait basculer entre les 4 onglets', () => {
    const spy = vi.spyOn(component.tabChange, 'emit');
    component.selectTab('roles');
    expect(component.activeTab).toBe('roles');
    expect(spy).toHaveBeenCalledWith('roles');

    component.selectTab('affectations');
    expect(component.activeTab).toBe('affectations');

    component.selectTab('historique');
    expect(component.activeTab).toBe('historique');
  });

  it('devrait afficher les affectations dans l onglet Affectations sans clic ni appel supplémentaire', () => {
    component.selectTab('affectations');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Institut Saint Jean');
    expect(el.textContent).toContain('ISI');
    expect(el.textContent).toContain('Personnel');
  });

  it('devrait afficher Bientôt disponible sur l onglet Historique sans appel d API', () => {
    component.selectTab('historique');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bientôt disponible');
  });
});

