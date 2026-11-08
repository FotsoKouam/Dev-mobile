import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleStatusDialogComponent } from './role-status-dialog.component';
import { Role } from '../../../core/api/models/role.model';

describe('RoleStatusDialogComponent', () => {
  let component: RoleStatusDialogComponent;
  let fixture: ComponentFixture<RoleStatusDialogComponent>;

  const mockCustomActiveRole: Role = {
    id: 'r1',
    code: 'custom_role',
    name: 'Responsable Pédagogique',
    description: 'Rôle personnalisé',
    isSystem: false,
    status: 'active',
    permissions: ['add_document'],
    usersCount: 3,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  const mockCustomInactiveRole: Role = {
    ...mockCustomActiveRole,
    status: 'inactive',
  };

  const mockSystemRole: Role = {
    ...mockCustomActiveRole,
    isSystem: true,
    code: 'staff',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleStatusDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleStatusDialogComponent);
    component = fixture.componentInstance;
  });

  it('devrait afficher la confirmation de désactivation pour un rôle personnalisé actif et émettre inactive', () => {
    component.isOpen = true;
    component.role = mockCustomActiveRole;
    fixture.detectChanges();

    expect(component.isDeactivate).toBe(true);

    const spy = vi.spyOn(component.confirmAction, 'emit');
    component.confirm();

    expect(spy).toHaveBeenCalledWith({ id: 'r1', status: 'inactive' });
  });

  it('devrait afficher la confirmation de réactivation pour un rôle inactif et émettre active', () => {
    component.isOpen = true;
    component.role = mockCustomInactiveRole;
    fixture.detectChanges();

    expect(component.isDeactivate).toBe(false);

    const spy = vi.spyOn(component.confirmAction, 'emit');
    component.confirm();

    expect(spy).toHaveBeenCalledWith({ id: 'r1', status: 'active' });
  });

  it('ne devrait jamais désactiver un rôle système', () => {
    component.isOpen = true;
    component.role = mockSystemRole;
    fixture.detectChanges();

    const spy = vi.spyOn(component.confirmAction, 'emit');
    component.confirm();

    expect(spy).not.toHaveBeenCalled();
  });

  it('devrait émettre cancelAction au clic sur annuler', () => {
    const spy = vi.spyOn(component.cancelAction, 'emit');
    component.cancel();
    expect(spy).toHaveBeenCalled();
  });
});

