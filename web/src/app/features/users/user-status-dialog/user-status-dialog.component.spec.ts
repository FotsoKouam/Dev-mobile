import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserStatusDialogComponent } from './user-status-dialog.component';
import { User } from '../../../core/api/models/user.model';

describe('UserStatusDialogComponent', () => {
  let component: UserStatusDialogComponent;
  let fixture: ComponentFixture<UserStatusDialogComponent>;

  const mockActiveUser: User = {
    id: 'u1',
    email: 'paul.essiane@campusia.cm',
    firstName: 'Paul',
    lastName: 'Essiane',
    phone: null,
    authMethod: 'google',
    status: 'active',
    lastLoginAt: null,
    assignments: [],
    createdAt: '2026-06-05T14:20:00.000Z',
    updatedAt: '2026-06-05T14:20:00.000Z',
  };

  const mockSuspendedUser: User = {
    ...mockActiveUser,
    id: 'u2',
    status: 'suspended',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStatusDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserStatusDialogComponent);
    component = fixture.componentInstance;
  });

  it('devrait afficher la confirmation de suspension pour un utilisateur actif et émettre status suspended', () => {
    component.isOpen = true;
    component.user = mockActiveUser;
    fixture.detectChanges();

    expect(component.isSuspend).toBe(true);

    const spy = vi.spyOn(component.confirmAction, 'emit');
    component.confirm();

    expect(spy).toHaveBeenCalledWith({ id: 'u1', status: 'suspended' });
  });

  it('devrait afficher la confirmation de réactivation pour un utilisateur suspendu et émettre status active', () => {
    component.isOpen = true;
    component.user = mockSuspendedUser;
    fixture.detectChanges();

    expect(component.isSuspend).toBe(false);

    const spy = vi.spyOn(component.confirmAction, 'emit');
    component.confirm();

    expect(spy).toHaveBeenCalledWith({ id: 'u2', status: 'active' });
  });

  it('devrait émettre cancelAction au clic sur annuler', () => {
    const spy = vi.spyOn(component.cancelAction, 'emit');
    component.cancel();
    expect(spy).toHaveBeenCalled();
  });
});

