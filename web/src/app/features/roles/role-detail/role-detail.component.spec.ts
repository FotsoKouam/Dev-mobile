import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RoleDetailComponent } from './role-detail.component';
import { RolesApiService } from '../../../core/api/roles-api.service';
import { Role } from '../../../core/api/models/role.model';
import { provideRouter } from '@angular/router';

describe('RoleDetailComponent', () => {
  let component: RoleDetailComponent;
  let fixture: ComponentFixture<RoleDetailComponent>;
  let rolesApiSpy: any;

  const mockSystemRole: Role = {
    id: 'role-1',
    code: 'staff',
    name: 'Personnel',
    description: 'Peut ajouter des documents aux espaces institutionnels de sa filière.',
    isSystem: true,
    status: 'active',
    usersCount: 24,
    permissions: ['add_document'],
    createdAt: '2025-06-05T14:20:00Z',
    updatedAt: '2025-09-10T10:28:00Z',
  };

  const mockCustomRole: Role = {
    id: 'role-2',
    code: 'custom',
    name: 'Coordonnateur',
    description: 'Gère les plannings et les filières',
    isSystem: false,
    status: 'active',
    usersCount: 3,
    permissions: ['manage_programs'],
    createdAt: '2025-06-05T14:20:00Z',
    updatedAt: '2025-09-10T10:28:00Z',
  };

  beforeEach(async () => {
    rolesApiSpy = {
      getUsersByRole: vi.fn().mockReturnValue(of({
        data: [
          { id: 'u1', firstName: 'Paul', lastName: 'Essiane', email: 'paul@campusia.cm', status: 'active' },
          { id: 'u2', firstName: 'Anne', lastName: 'Tchinda', email: 'anne@campusia.cm', status: 'active' },
        ],
        meta: { page: 1, limit: 5, total: 24 }
      }))
    };

    await TestBed.configureTestingModule({
      imports: [RoleDetailComponent],
      providers: [
        provideRouter([]),
        { provide: RolesApiService, useValue: rolesApiSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RoleDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should switch tabs properly and sync activeTab and currentTab signal', () => {
    component.selectTab('permissions');
    expect(component.activeTab).toBe('permissions');
    expect(component.currentTab()).toBe('permissions');

    component.selectTab('utilisateurs');
    expect(component.activeTab).toBe('utilisateurs');
    expect(component.currentTab()).toBe('utilisateurs');
  });

  it('should load users when role is set and utilisateurs tab is active', () => {
    component.role = mockSystemRole;
    component.activeTab = 'utilisateurs';
    component.currentTab.set('utilisateurs');
    component.loadUsers();

    expect(rolesApiSpy.getUsersByRole).toHaveBeenCalledWith('staff', 5);
    expect(component.users().length).toBe(2);
  });

  it('should format creation and update dates properly', () => {
    component.role = mockSystemRole;
    expect(component.formattedCreatedAt).toContain('2025');
    expect(component.formattedUpdatedAt).toContain('2025');
  });

  it('should return correct display name and scope', () => {
    component.role = mockSystemRole;
    expect(component.roleDisplayName).toBe('Personnel');
    expect(component.roleScopeText).toBe('Sa filière');
  });

  it('should check permissions properly', () => {
    component.role = mockSystemRole;
    expect(component.hasPermission('add_document')).toBe(true);
    expect(component.hasPermission('manage_schools')).toBe(false);
  });
});
