import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RolesComponent } from './roles.component';
import { RolesApiService } from '../../core/api/roles-api.service';
import { UsersApiService } from '../../core/api/users-api.service';
import { SessionService } from '../../core/session.service';
import { API_CONFIG } from '../../core/api.config';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Role } from '../../core/api/models/role.model';

describe('RolesComponent', () => {
  let component: RolesComponent;
  let fixture: ComponentFixture<RolesComponent>;
  let rolesApiSpy: any;
  let usersApiSpy: any;
  let sessionServiceSpy: any;
  let toastSpy: any;

  const mockRoles: Role[] = [
    {
      id: 'role-1',
      code: 'platform_admin',
      name: 'Administrateur plateforme',
      description: 'Accès total à toute la plateforme CampusIA.',
      isSystem: true,
      status: 'active',
      usersCount: 2,
      permissions: ['manage_schools', 'manage_programs', 'manage_users', 'manage_roles', 'access_all_schools'],
      createdAt: '2025-06-05T14:20:00Z',
      updatedAt: '2025-09-10T10:28:00Z',
    },
    {
      id: 'role-2',
      code: 'custom',
      name: 'Coordonnateur Pédagogique',
      description: 'Gère les filières et documents.',
      isSystem: false,
      status: 'active',
      usersCount: 4,
      permissions: ['manage_programs', 'add_document'],
      createdAt: '2025-06-05T14:20:00Z',
      updatedAt: '2025-09-10T10:28:00Z',
    },
  ];

  beforeEach(async () => {
    rolesApiSpy = {
      getRoles: vi.fn().mockReturnValue(of({
        data: mockRoles,
        meta: { page: 1, limit: 10, total: 2 },
      })),
      getRole: vi.fn(),
      createRole: vi.fn(),
      updateRole: vi.fn(),
      updateRoleStatus: vi.fn(),
      getStats: vi.fn().mockReturnValue(of({
        total: 2,
        system: 1,
        permissionsCount: 10,
        assignedUsers: 6,
        totalRoles: 2,
        systemRoles: 1,
        definedPermissions: 10,
      })),
      getUsersByRole: vi.fn(),
    };

    usersApiSpy = {
      getStats: vi.fn().mockReturnValue(of({ users: { total: 10, active: 10 } })),
    };

    sessionServiceSpy = {
      hasPermission: vi.fn().mockReturnValue(true),
      user: vi.fn().mockReturnValue({ firstName: 'Fatso', lastName: 'Admin' }),
      currentUser: vi.fn().mockReturnValue({ firstName: 'Fatso', lastName: 'Admin' }),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };

    toastSpy = {
      success: vi.fn(),
      toasts: vi.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_CONFIG, useValue: { apiUrl: 'https://test.api' } },
        { provide: RolesApiService, useValue: rolesApiSpy },
        { provide: UsersApiService, useValue: usersApiSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
  });

  it('should create and load roles and stats on init without user click', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(rolesApiSpy.getRoles).toHaveBeenCalled();
    expect(rolesApiSpy.getStats).toHaveBeenCalled();
    expect(component.roles().length).toBe(2);
    expect(component.stats()?.totalRoles).toBe(2);
    expect(component.loadingRoles()).toBe(false);
  });

  it('should filter roles by type', () => {
    fixture.detectChanges();

    component.onTypeChange('system');
    expect(component.selectedType()).toBe('system');
    expect(component.currentPage()).toBe(1);
  });

  it('should filter roles by status', () => {
    fixture.detectChanges();

    component.onStatusChange('active');
    expect(component.selectedStatus()).toBe('active');
    expect(component.currentPage()).toBe(1);
  });

  it('should open and close role detail panel', () => {
    fixture.detectChanges();

    component.openDetail(mockRoles[0], 'permissions');
    expect(component.isDetailOpen()).toBe(true);
    expect(component.detailRole()?.id).toBe('role-1');
    expect(component.activeDetailTab()).toBe('permissions');

    component.closeDetail();
    expect(component.isDetailOpen()).toBe(false);
    expect(component.detailRole()).toBeNull();
  });

  it('should not allow opening status dialog for system role', () => {
    fixture.detectChanges();

    component.openStatusDialog(mockRoles[0]); // system role
    expect(component.isStatusDialogOpen()).toBe(false);
  });

  it('should allow opening status dialog for custom role', () => {
    fixture.detectChanges();

    component.openStatusDialog(mockRoles[1]); // custom role
    expect(component.isStatusDialogOpen()).toBe(true);
    expect(component.statusDialogRole()?.id).toBe('role-2');
  });

  it('should deactivate custom role when confirmed in dialog', () => {
    fixture.detectChanges();

    rolesApiSpy.updateRoleStatus.mockReturnValue(of({
      ...mockRoles[1],
      status: 'inactive',
    }));

    component.openStatusDialog(mockRoles[1]);
    component.confirmStatusChange();

    expect(rolesApiSpy.updateRoleStatus).toHaveBeenCalledWith('role-2', 'inactive');
    expect(toastSpy.success).toHaveBeenCalled();
    expect(component.isStatusDialogOpen()).toBe(false);
  });

  it('should display error banner if rolesApi fails', () => {
    rolesApiSpy.getRoles.mockReturnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();

    expect(component.errorRoles()).toBe(true);
    expect(component.loadingRoles()).toBe(false);
  });
});
