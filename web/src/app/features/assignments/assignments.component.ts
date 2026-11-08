import {
  Component,
  OnInit,
  AfterViewInit,
  inject,
  ViewChild,
  TemplateRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminLayoutComponent } from '../../shared/layout/admin-layout.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { RoleBadgeComponent } from '../../shared/ui/role-badge/role-badge.component';
import { DataTableComponent, ColumnDef } from '../../shared/ui/data-table/data-table.component';
import { ErrorBannerComponent } from '../../shared/ui/error-banner/error-banner.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AssignmentFormComponent } from './assignment-form/assignment-form.component';
import {
  AssignmentDetailComponent,
  AssignmentDetailTab,
} from './assignment-detail/assignment-detail.component';
import { AssignmentRemoveDialogComponent } from './assignment-remove-dialog/assignment-remove-dialog.component';
import { AssignmentsApiService } from '../../core/api/assignments-api.service';
import { SessionService } from '../../core/session.service';
import {
  Assignment,
  AssignmentStatus,
  AssignmentStats,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  PageMeta,
} from '../../core/api/models/assignment.model';
import { School, Program } from '../../core/api/models/school.model';
import { UserRole } from '../../core/api/models/user.model';
import { I18N_FR } from '../../shared/i18n/fr';

export type RoleCode = UserRole;

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminLayoutComponent,
    StatCardComponent,
    StatusBadgeComponent,
    RoleBadgeComponent,
    DataTableComponent,
    ErrorBannerComponent,
    AssignmentFormComponent,
    AssignmentDetailComponent,
    AssignmentRemoveDialogComponent,
  ],
  templateUrl: './assignments.component.html',
  styleUrl: './assignments.component.css',
})
export class AssignmentsComponent implements OnInit, AfterViewInit {
  @ViewChild('cellUser') cellUserTpl!: TemplateRef<any>;
  @ViewChild('cellSchool') cellSchoolTpl!: TemplateRef<any>;
  @ViewChild('cellProgram') cellProgramTpl!: TemplateRef<any>;
  @ViewChild('cellRole') cellRoleTpl!: TemplateRef<any>;
  @ViewChild('cellSpaces') cellSpacesTpl!: TemplateRef<any>;
  @ViewChild('cellStatus') cellStatusTpl!: TemplateRef<any>;
  @ViewChild('cellActions') cellActionsTpl!: TemplateRef<any>;
  @ViewChild('assignmentFormCmp') assignmentFormCmp?: AssignmentFormComponent;

  private readonly api = inject(AssignmentsApiService);
  private readonly sessionService = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly i18n = I18N_FR;

  // Stats
  readonly stats = signal<AssignmentStats | null>(null);
  readonly loadingStats = signal<boolean>(true);

  // Table & List
  readonly assignments = signal<Assignment[]>([]);
  readonly meta = signal<PageMeta | undefined>(undefined);
  readonly loadingAssignments = signal<boolean>(false);
  readonly errorAssignments = signal<boolean>(false);

  // Filtres
  readonly searchTerm = signal<string>('');
  readonly selectedSchoolId = signal<string>('');
  readonly selectedProgramId = signal<string>('');
  readonly selectedRoleCode = signal<RoleCode | ''>('');
  readonly selectedStatus = signal<AssignmentStatus | ''>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  // Listes pour filtres
  readonly schoolsList = signal<School[]>([]);
  readonly programsList = signal<Program[]>([]);
  readonly loadingPrograms = signal<boolean>(false);

  readonly roleFilterOptions: { code: RoleCode; label: string }[] = [
    { code: 'platform_admin', label: I18N_FR.roles.platform_admin },
    { code: 'school_admin', label: I18N_FR.roles.school_admin },
    { code: 'staff', label: I18N_FR.roles.staff },
    { code: 'student', label: I18N_FR.roles.student },
    { code: 'guest', label: I18N_FR.roles.guest },
  ];

  private searchSubject = new Subject<string>();

  // Panneau latéral
  readonly detailAssignment = signal<Assignment | null>(null);
  readonly isDetailOpen = signal<boolean>(false);
  readonly activeDetailTab = signal<AssignmentDetailTab>('assignment');

  // Modal Formulaire
  readonly isFormOpen = signal<boolean>(false);
  readonly formAssignmentToEdit = signal<Assignment | null>(null);
  readonly formLoading = signal<boolean>(false);

  // Modal Retrait
  readonly isRemoveDialogOpen = signal<boolean>(false);
  readonly assignmentToRemove = signal<Assignment | null>(null);
  readonly removeLoading = signal<boolean>(false);

  // Table columns definition
  columns: ColumnDef<Assignment>[] = [];

  // Permissions & Identifiants
  get canManageAssignments(): boolean {
    return this.sessionService.hasPermission('manage_assignments');
  }

  get currentSessionUserId(): string | null {
    const user = this.sessionService.user();
    return user?.id || null;
  }

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.currentPage.set(1);
        this.loadAssignments();
        this.updateQueryParams();
      });

    this.route.queryParams.subscribe((params) => {
      let shouldReload = false;

      if (params['search'] && params['search'] !== this.searchTerm()) {
        this.searchTerm.set(params['search']);
        shouldReload = true;
      }
      if (params['schoolId'] && params['schoolId'] !== this.selectedSchoolId()) {
        this.selectedSchoolId.set(params['schoolId']);
        this.loadProgramsForSchool(params['schoolId']);
        shouldReload = true;
      }
      if (params['programId'] && params['programId'] !== this.selectedProgramId()) {
        this.selectedProgramId.set(params['programId']);
        shouldReload = true;
      }
      if (params['roleCode'] && params['roleCode'] !== this.selectedRoleCode()) {
        this.selectedRoleCode.set(params['roleCode'] as RoleCode);
        shouldReload = true;
      }
      if (params['status'] && params['status'] !== this.selectedStatus()) {
        this.selectedStatus.set(params['status'] as AssignmentStatus);
        shouldReload = true;
      }
      if (params['page']) {
        const pageNum = parseInt(params['page'], 10);
        if (!isNaN(pageNum) && pageNum !== this.currentPage()) {
          this.currentPage.set(pageNum);
          shouldReload = true;
        }
      }

      if (params['tab']) {
        this.activeDetailTab.set(params['tab'] as AssignmentDetailTab);
      }

      if (params['assignment']) {
        this.loadDetailAssignmentById(params['assignment']);
      } else {
        this.isDetailOpen.set(false);
      }

      if (shouldReload || this.assignments().length === 0) {
        this.loadAssignments();
      }
    });

    this.loadSchools();
    this.loadStats();
  }

  ngAfterViewInit(): void {
    this.columns = [
      {
        key: 'user',
        header: this.i18n.assignmentsPage.table.user,
        template: this.cellUserTpl,
      },
      {
        key: 'school',
        header: this.i18n.assignmentsPage.table.school,
        template: this.cellSchoolTpl,
      },
      {
        key: 'program',
        header: this.i18n.assignmentsPage.table.program,
        template: this.cellProgramTpl,
      },
      {
        key: 'role',
        header: this.i18n.assignmentsPage.table.role,
        template: this.cellRoleTpl,
      },
      {
        key: 'status',
        header: this.i18n.assignmentsPage.table.status,
        template: this.cellStatusTpl,
      },
      {
        key: 'actions',
        header: '',
        template: this.cellActionsTpl,
        align: 'right',
      },
    ];
  }

  loadSchools(): void {
    this.api.getSchools(100).subscribe({
      next: (res) => {
        this.schoolsList.set(res.data || []);
      },
      error: () => {
        this.schoolsList.set([]);
      },
    });
  }

  loadProgramsForSchool(schoolId: string): void {
    if (!schoolId) {
      this.programsList.set([]);
      return;
    }
    this.loadingPrograms.set(true);
    this.api.getSchoolPrograms(schoolId).subscribe({
      next: (progs) => {
        this.programsList.set(progs || []);
        this.loadingPrograms.set(false);
      },
      error: () => {
        this.programsList.set([]);
        this.loadingPrograms.set(false);
      },
    });
  }

  loadStats(): void {
    this.loadingStats.set(true);
    this.api.getStats().subscribe({
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

  loadAssignments(): void {
    this.loadingAssignments.set(true);
    this.errorAssignments.set(false);

    this.api
      .getAssignments({
        page: this.currentPage(),
        limit: this.pageSize(),
        search: this.searchTerm() || undefined,
        schoolId: this.selectedSchoolId() || undefined,
        programId: this.selectedProgramId() || undefined,
        roleCode: this.selectedRoleCode() || undefined,
        status: this.selectedStatus() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.assignments.set(res.data || []);
          this.meta.set(res.meta);
          this.loadingAssignments.set(false);
        },
        error: () => {
          this.loadingAssignments.set(false);
          this.errorAssignments.set(true);
        },
      });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onSchoolFilterChange(schoolId: string): void {
    this.selectedSchoolId.set(schoolId);
    this.selectedProgramId.set(''); // Réinitialiser la filière
    this.currentPage.set(1);
    this.loadProgramsForSchool(schoolId);
    this.loadAssignments();
    this.updateQueryParams();
  }

  onProgramFilterChange(programId: string): void {
    this.selectedProgramId.set(programId);
    this.currentPage.set(1);
    this.loadAssignments();
    this.updateQueryParams();
  }

  onRoleFilterChange(roleCode: RoleCode | ''): void {
    this.selectedRoleCode.set(roleCode);
    this.currentPage.set(1);
    this.loadAssignments();
    this.updateQueryParams();
  }

  onStatusFilterChange(status: AssignmentStatus | ''): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadAssignments();
    this.updateQueryParams();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedSchoolId.set('');
    this.selectedProgramId.set('');
    this.selectedRoleCode.set('');
    this.selectedStatus.set('');
    this.currentPage.set(1);
    this.programsList.set([]);
    this.loadAssignments();
    this.updateQueryParams();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadAssignments();
    this.updateQueryParams();
  }

  onRefresh(): void {
    this.loadAssignments();
    this.loadStats();
  }

  // Helpers visuels
  getUserInitials(user: { firstName?: string; lastName?: string }): string {
    const f = user.firstName?.[0] || '';
    const l = user.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  }

  getSchoolDisplayName(assignment: Assignment): string {
    if (assignment.role.code === 'platform_admin') {
      return this.i18n.assignmentsPage.table.allSchools;
    }
    return assignment.school?.name || '—';
  }

  getProgramDisplayName(assignment: Assignment): string {
    if (assignment.role.code === 'school_admin') {
      return this.i18n.assignmentsPage.table.allPrograms;
    }
    return assignment.program?.name || '—';
  }

  isSelfAdmin(assignment: Assignment): boolean {
    const currentId = this.currentSessionUserId;
    if (!currentId) return false;
    const isSameUser = assignment.user.id === currentId;
    const isAdmin =
      assignment.role.code === 'platform_admin' ||
      assignment.role.code === 'school_admin';
    return isSameUser && isAdmin;
  }

  // Détail
  openDetail(
    assignment: Assignment,
    tab: AssignmentDetailTab = 'assignment'
  ): void {
    this.detailAssignment.set(assignment);
    this.activeDetailTab.set(tab);
    this.isDetailOpen.set(true);
    this.updateQueryParams();
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
    this.detailAssignment.set(null);
    this.updateQueryParams();
  }

  private loadDetailAssignmentById(id: string): void {
    const existing = this.assignments().find((a) => a.id === id);
    if (existing) {
      this.detailAssignment.set(existing);
      this.isDetailOpen.set(true);
    } else {
      this.api.getAssignment(id).subscribe({
        next: (res) => {
          this.detailAssignment.set(res);
          this.isDetailOpen.set(true);
        },
        error: () => {
          // ignorer ou laisser fermé
        },
      });
    }
  }

  // Création / Édition
  openCreateModal(): void {
    this.formAssignmentToEdit.set(null);
    this.isFormOpen.set(true);
  }

  openEditModal(assignment: Assignment): void {
    this.formAssignmentToEdit.set(assignment);
    this.isFormOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormOpen.set(false);
    this.formAssignmentToEdit.set(null);
  }

  saveAssignmentForm(dto: CreateAssignmentDto | UpdateAssignmentDto): void {
    const toEdit = this.formAssignmentToEdit();
    this.formLoading.set(true);

    if (toEdit) {
      this.api.updateAssignment(toEdit.id, dto as UpdateAssignmentDto).subscribe({
        next: (updated) => {
          this.formLoading.set(false);
          this.toast.success(this.i18n.assignmentsPage.form.toastUpdated);
          this.closeFormModal();
          this.loadAssignments();
          if (this.detailAssignment()?.id === updated.id) {
            this.detailAssignment.set(updated);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.formLoading.set(false);
          this.assignmentFormCmp?.handleApiError(err);
        },
      });
    } else {
      this.api.createAssignment(dto as CreateAssignmentDto).subscribe({
        next: (created) => {
          this.formLoading.set(false);
          this.toast.success(this.i18n.assignmentsPage.form.toastCreated);
          this.closeFormModal();
          this.loadAssignments();
          this.loadStats();
          this.openDetail(created);
        },
        error: (err: HttpErrorResponse) => {
          this.formLoading.set(false);
          this.assignmentFormCmp?.handleApiError(err);
        },
      });
    }
  }

  // Retrait d'affectation
  openRemoveDialog(assignment: Assignment): void {
    if (this.isSelfAdmin(assignment)) {
      this.toast.success(this.i18n.assignmentsPage.removeDialog.selfAdminError);
      return;
    }
    this.assignmentToRemove.set(assignment);
    this.isRemoveDialogOpen.set(true);
  }

  closeRemoveDialog(): void {
    this.isRemoveDialogOpen.set(false);
    this.assignmentToRemove.set(null);
  }

  confirmRemove(assignment: Assignment): void {
    this.removeLoading.set(true);
    this.api.deactivateAssignment(assignment.id).subscribe({
      next: (deactivated) => {
        this.removeLoading.set(false);
        this.toast.success(this.i18n.assignmentsPage.removeDialog.toastRemoved);
        this.closeRemoveDialog();
        this.loadAssignments();
        if (this.detailAssignment()?.id === assignment.id) {
          this.detailAssignment.set(deactivated);
        }
      },
      error: () => {
        this.removeLoading.set(false);
      },
    });
  }

  // URL Sync
  private updateQueryParams(): void {
    const queryParams: Record<string, any> = {};

    if (this.searchTerm()) queryParams['search'] = this.searchTerm();
    if (this.selectedSchoolId()) queryParams['schoolId'] = this.selectedSchoolId();
    if (this.selectedProgramId()) queryParams['programId'] = this.selectedProgramId();
    if (this.selectedRoleCode()) queryParams['roleCode'] = this.selectedRoleCode();
    if (this.selectedStatus()) queryParams['status'] = this.selectedStatus();
    if (this.currentPage() > 1) queryParams['page'] = this.currentPage();

    if (this.isDetailOpen() && this.detailAssignment()) {
      queryParams['assignment'] = this.detailAssignment()!.id;
      if (this.activeDetailTab() !== 'assignment') {
        queryParams['tab'] = this.activeDetailTab();
      }
    } else {
      queryParams['assignment'] = null;
      queryParams['tab'] = null;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
