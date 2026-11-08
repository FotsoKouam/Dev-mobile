import { Component, OnInit, inject, ViewChild, TemplateRef, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminLayoutComponent } from '../../shared/layout/admin-layout.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { RoleBadgeComponent } from '../../shared/ui/role-badge/role-badge.component';
import { DataTableComponent, ColumnDef } from '../../shared/ui/data-table/data-table.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorBannerComponent } from '../../shared/ui/error-banner/error-banner.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { UserFormComponent } from './user-form/user-form.component';
import { UserDetailComponent, UserDetailTab } from './user-detail/user-detail.component';
import { UserStatusDialogComponent } from './user-status-dialog/user-status-dialog.component';
import { UsersApiService } from '../../core/api/users-api.service';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { SessionService } from '../../core/session.service';
import {
  User,
  UserStats,
  UserStatus,
  UserRole,
  CreateUserDto,
  UpdateUserDto,
  PageMeta,
} from '../../core/api/models/user.model';
import { School, Program } from '../../core/api/models/school.model';
import { I18N_FR } from '../../shared/i18n/fr';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminLayoutComponent,
    StatCardComponent,
    StatusBadgeComponent,
    RoleBadgeComponent,
    DataTableComponent,
    EmptyStateComponent,
    ErrorBannerComponent,
    UserFormComponent,
    UserDetailComponent,
    UserStatusDialogComponent,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit, AfterViewInit {
  @ViewChild('cellName') cellNameTpl!: TemplateRef<any>;
  @ViewChild('cellSchool') cellSchoolTpl!: TemplateRef<any>;
  @ViewChild('cellProgram') cellProgramTpl!: TemplateRef<any>;
  @ViewChild('cellRole') cellRoleTpl!: TemplateRef<any>;
  @ViewChild('cellStatus') cellStatusTpl!: TemplateRef<any>;
  @ViewChild('cellLastLogin') cellLastLoginTpl!: TemplateRef<any>;
  @ViewChild('cellActions') cellActionsTpl!: TemplateRef<any>;

  private readonly usersApi = inject(UsersApiService);
  private readonly schoolsApi = inject(SchoolsApiService);
  private readonly sessionService = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly i18n = I18N_FR;

  // Stats
  readonly stats = signal<UserStats | null>(null);
  readonly loadingStats = signal<boolean>(true);

  // Table & List
  readonly users = signal<User[]>([]);
  readonly meta = signal<PageMeta | undefined>(undefined);
  readonly loadingUsers = signal<boolean>(false);
  readonly errorUsers = signal<boolean>(false);

  // Filtres
  readonly searchTerm = signal<string>('');
  readonly selectedRole = signal<UserRole | ''>('');
  readonly selectedSchoolId = signal<string>('');
  readonly selectedProgramId = signal<string>('');
  readonly selectedStatus = signal<UserStatus | ''>('');
  readonly currentPage = signal<number>(1);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  // Listes déroulantes pour les filtres
  readonly schoolsList = signal<School[]>([]);
  readonly programsList = signal<Program[]>([]);

  private searchSubject = new Subject<string>();

  // Panneau latéral
  readonly detailUser = signal<User | null>(null);
  readonly isDetailOpen = signal<boolean>(false);
  readonly activeDetailTab = signal<UserDetailTab>('informations');

  // Modal Formulaire
  readonly isUserFormOpen = signal<boolean>(false);
  readonly userToEdit = signal<User | null>(null);
  readonly submittingUser = signal<boolean>(false);

  // Modal Changement de statut (Suspendre / Réactiver)
  readonly isStatusDialogOpen = signal<boolean>(false);
  readonly userForStatusAction = signal<User | null>(null);
  readonly submittingStatus = signal<boolean>(false);

  // Colonnes DataTable
  columns: ColumnDef<User>[] = [];

  // Suivi de l'état des filtres pour éviter les rechargements inutiles
  private lastFilterState: string | null = null;

  get canManageUsers(): boolean {
    return this.sessionService.hasPermission('manage_users');
  }

  get currentUserId(): string | undefined {
    return this.sessionService.user()?.id;
  }

  get hasActiveFilters(): boolean {
    return (
      !!this.searchTerm() ||
      !!this.selectedRole() ||
      !!this.selectedSchoolId() ||
      !!this.selectedProgramId() ||
      !!this.selectedStatus()
    );
  }

  ngOnInit(): void {
    this.initColumns();
    this.setupSearchDebounce();
    this.loadSchoolsFilter();

    this.route.queryParams.subscribe((params) => {
      const page = params['page'] ? parseInt(params['page'], 10) : 1;
      const search: string = params['search'] || '';
      const role: UserRole | '' = params['role'] || '';
      const schoolId: string = params['schoolId'] || '';
      const programId: string = params['programId'] || '';
      const status: UserStatus | '' = params['status'] || '';
      const userId: string | undefined = params['user'];
      const tab = params['tab'] as UserDetailTab;

      const filterState = `${page}-${search}-${role}-${schoolId}-${programId}-${status}`;
      const filtersChanged = filterState !== this.lastFilterState;

      this.currentPage.set(page);
      this.searchTerm.set(search);
      this.selectedRole.set(role);
      this.selectedSchoolId.set(schoolId);
      this.selectedProgramId.set(programId);
      this.selectedStatus.set(status);

      if (tab) {
        this.activeDetailTab.set(tab);
      }

      if (schoolId) {
        this.loadProgramsFilter(schoolId);
      } else {
        this.programsList.set([]);
      }

      if (filtersChanged) {
        this.lastFilterState = filterState;
        this.loadUsers();
      }

      if (userId) {
        if (this.detailUser()?.id !== userId) {
          this.openDetailById(userId);
        }
        this.isDetailOpen.set(true);
      } else {
        this.isDetailOpen.set(false);
        this.detailUser.set(null);
      }
    });

    this.loadStats();
  }

  ngAfterViewInit(): void {
    this.initColumns();
  }

  private initColumns(): void {
    this.columns = [
      { key: 'name', header: this.i18n.users.table.name, template: this.cellNameTpl },
      { key: 'school', header: this.i18n.users.table.school, width: '180px', template: this.cellSchoolTpl },
      { key: 'program', header: this.i18n.users.table.program, width: '130px', template: this.cellProgramTpl },
      { key: 'role', header: this.i18n.users.table.role, width: '140px', template: this.cellRoleTpl },
      { key: 'status', header: this.i18n.users.table.status, width: '120px', template: this.cellStatusTpl },
      { key: 'lastLoginAt', header: this.i18n.users.table.lastLogin, width: '150px', template: this.cellLastLoginTpl },
      { key: 'actions', header: '', width: '100px', align: 'right', template: this.cellActionsTpl },
    ];
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.updateQueryParams({ search: term || null, page: 1 });
      });
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  onRoleChange(role: UserRole | ''): void {
    this.selectedRole.set(role);
    this.updateQueryParams({ role: role || null, page: 1 });
  }

  onSchoolChange(schoolId: string): void {
    this.selectedSchoolId.set(schoolId);
    this.selectedProgramId.set('');
    this.updateQueryParams({
      schoolId: schoolId || null,
      programId: null,
      page: 1,
    });
  }

  onProgramChange(programId: string): void {
    this.selectedProgramId.set(programId);
    this.updateQueryParams({ programId: programId || null, page: 1 });
  }

  onStatusChange(status: UserStatus | ''): void {
    this.selectedStatus.set(status);
    this.updateQueryParams({ status: status || null, page: 1 });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedRole.set('');
    this.selectedSchoolId.set('');
    this.selectedProgramId.set('');
    this.selectedStatus.set('');
    this.updateQueryParams({
      search: null,
      role: null,
      schoolId: null,
      programId: null,
      status: null,
      page: 1,
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.updateQueryParams({ page: page > 1 ? page : null });
  }

  toggleSortByName(): void {
    const newDir = this.sortDirection() === 'asc' ? 'desc' : 'asc';
    this.sortDirection.set(newDir);
    // Tri côté client de la liste affichée (le backend ne supporte pas sort dans QueryUserDto)
    const sorted = [...this.users()].sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return newDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    this.users.set(sorted);
  }

  private updateQueryParams(params: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  loadSchoolsFilter(): void {
    this.schoolsApi.getSchools({ limit: 100 }).subscribe({
      next: (res) => {
        this.schoolsList.set(res.data || []);
      },
      error: () => {
        this.schoolsList.set([]);
      },
    });
  }

  loadProgramsFilter(schoolId: string): void {
    if (!schoolId) {
      this.programsList.set([]);
      return;
    }
    this.schoolsApi.getPrograms(schoolId, { limit: 100 }).subscribe({
      next: (res) => {
        this.programsList.set(res.data || []);
      },
      error: () => {
        this.programsList.set([]);
      },
    });
  }

  loadStats(): void {
    this.loadingStats.set(true);
    this.usersApi.getStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.loadingStats.set(false);
      },
      error: () => {
        this.stats.set(null);
        this.loadingStats.set(false);
      },
    });
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.errorUsers.set(false);

    this.usersApi
      .getUsers({
        page: this.currentPage(),
        limit: 10,
        search: this.searchTerm().trim() || undefined,
        roleCode: this.selectedRole() || undefined,
        schoolId: this.selectedSchoolId() || undefined,
        programId: this.selectedProgramId() || undefined,
        status: this.selectedStatus() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data || []);
          this.meta.set(res.meta);
          this.loadingUsers.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement des utilisateurs:', err);
          this.errorUsers.set(true);
          this.loadingUsers.set(false);
        },
      });
  }

  // --- Gestion du panneau latéral ---
  openDetail(user: User): void {
    this.detailUser.set(user);
    this.isDetailOpen.set(true);
    this.updateQueryParams({ user: user.id, tab: this.activeDetailTab() || 'informations' });
  }

  openDetailById(id: string): void {
    this.usersApi.getUser(id).subscribe({
      next: (user) => {
        this.detailUser.set(user);
        this.isDetailOpen.set(true);
      },
      error: () => {
        this.closeDetail();
      },
    });
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
    this.detailUser.set(null);
    this.updateQueryParams({ user: null, tab: null });
  }

  onDetailTabChange(tab: UserDetailTab): void {
    this.activeDetailTab.set(tab);
    this.updateQueryParams({ tab });
  }

  // --- Modal Création / Inviter ---
  openInviteUser(): void {
    this.userToEdit.set(null);
    this.isUserFormOpen.set(true);
  }

  openEditUser(user: User): void {
    this.userToEdit.set(user);
    this.isUserFormOpen.set(true);
  }

  closeUserForm(): void {
    this.isUserFormOpen.set(false);
    this.userToEdit.set(null);
  }

  onSaveUser(dto: CreateUserDto | UpdateUserDto, formComp: UserFormComponent): void {
    this.submittingUser.set(true);

    const userToEditVal = this.userToEdit();
    if (userToEditVal) {
      this.usersApi.updateUser(userToEditVal.id, dto as UpdateUserDto).subscribe({
        next: (updated) => {
          this.submittingUser.set(false);
          this.closeUserForm();
          this.toast.success(this.i18n.users.form.toastUpdated);
          this.loadUsers();
          this.loadStats();
          if (this.detailUser()?.id === updated.id) {
            this.detailUser.set(updated);
          }
        },
        error: (err) => {
          this.submittingUser.set(false);
          formComp.handleApiError(err);
        },
      });
    } else {
      this.usersApi.createUser(dto as CreateUserDto).subscribe({
        next: () => {
          this.submittingUser.set(false);
          this.closeUserForm();
          this.toast.success(this.i18n.users.form.toastInvited);
          this.loadUsers();
          this.loadStats();
        },
        error: (err) => {
          this.submittingUser.set(false);
          formComp.handleApiError(err);
        },
      });
    }
  }

  // --- Modal Suspension / Réactivation ---
  openStatusDialog(user: User): void {
    if (user.id === this.currentUserId) {
      return; // Ne peut pas se suspendre lui-même
    }
    this.userForStatusAction.set(user);
    this.isStatusDialogOpen.set(true);
  }

  closeStatusDialog(): void {
    this.isStatusDialogOpen.set(false);
    this.userForStatusAction.set(null);
  }

  onConfirmStatusChange(event: { id: string; status: 'active' | 'suspended' }): void {
    this.submittingStatus.set(true);
    this.usersApi.updateUserStatus(event.id, event.status).subscribe({
      next: (updated) => {
        this.submittingStatus.set(false);
        this.closeStatusDialog();
        const msg =
          event.status === 'suspended'
            ? this.i18n.users.statusDialog.toastSuspended
            : this.i18n.users.statusDialog.toastReactivated;
        this.toast.success(msg);
        this.loadUsers();
        this.loadStats();
        if (this.detailUser()?.id === updated.id) {
          this.detailUser.set(updated);
        }
      },
      error: (err) => {
        this.submittingStatus.set(false);
        console.error('Erreur mise à jour statut utilisateur:', err);
      },
    });
  }

  // Helpers template pour extraire école / filière / rôle d'un utilisateur
  getUserInitials(user: User): string {
    const f = user.firstName?.[0] || '';
    const l = user.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  }

  getUserPrimaryRole(user: User): UserRole | null {
    if (!user.assignments || user.assignments.length === 0) return null;
    return user.assignments[0].role.code;
  }

  getUserSchoolName(user: User): string {
    if (!user.assignments || user.assignments.length === 0) return '—';
    const firstAss = user.assignments[0];
    if (firstAss.role.code === 'platform_admin' || !firstAss.school) {
      return this.i18n.users.table.allSchoolsScope;
    }
    return firstAss.school.name;
  }

  getUserProgramName(user: User): string {
    if (!user.assignments || user.assignments.length === 0) return '—';
    const firstAss = user.assignments[0];
    if (firstAss.role.code === 'school_admin' && !firstAss.program) {
      return this.i18n.users.table.allProgramsScope;
    }
    return firstAss.program?.name || '—';
  }

  formatLastLogin(lastLoginAt: string | null): string {
    if (!lastLoginAt) return this.i18n.users.table.never;
    try {
      const d = new Date(lastLoginAt);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return lastLoginAt;
    }
  }
}

