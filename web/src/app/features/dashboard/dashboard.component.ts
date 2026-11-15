import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminLayoutComponent } from '../../shared/layout/admin-layout.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { UsersApiService } from '../../core/api/users-api.service';
import { SpacesApiService } from '../../core/api/spaces-api.service';
import { DocumentsApiService } from '../../core/api/documents-api.service';
import { AuditApiService } from '../../core/api/audit-api.service';
import { SessionService } from '../../core/session.service';
import { School, SchoolStats } from '../../core/api/models/school.model';
import { UserStats } from '../../core/api/models/user.model';
import { DocumentStats } from '../../core/api/models/document.model';
import { AuditLogItem } from '../../core/api/models/audit.model';
import { I18N_FR } from '../../shared/i18n/fr';

interface RoleSlice {
  role: string;
  count: number;
  label: string;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AdminLayoutComponent,
    StatCardComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly schoolsApi = inject(SchoolsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly spacesApi = inject(SpacesApiService);
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly auditApi = inject(AuditApiService);
  private readonly session = inject(SessionService);

  readonly i18n = I18N_FR;

  // Permissions
  readonly canManageSchools = computed(() => this.session.hasPermission('manage_schools'));
  readonly canManagePrograms = computed(() => this.session.hasPermission('manage_programs'));
  readonly canManageUsers = computed(() => this.session.hasPermission('manage_users'));
  readonly canCreateSpace = computed(() => this.session.hasPermission('create_institutional_space'));
  readonly canViewAudit = computed(() => this.session.hasPermission('view_audit_log'));

  // Blocks permissions
  readonly showSchoolsCard = computed(() => this.canManageSchools() || this.canManagePrograms());
  readonly showProgramsCard = computed(() => this.canManageSchools() || this.canManagePrograms());
  readonly showUsersCard = computed(() => this.canManageUsers());
  readonly showSpacesCard = computed(() => this.canManagePrograms());
  readonly showDocumentsCard = computed(() => this.canManagePrograms());
  readonly showActivity = computed(() => this.canViewAudit());
  readonly showSchoolsOverview = computed(() => this.canManageSchools());
  readonly showRoleDistribution = computed(() => this.canManageUsers());

  // Block states: School & Program stats
  readonly schoolStats = signal<SchoolStats | null>(null);
  readonly loadingSchoolStats = signal<boolean>(false);
  readonly errorSchoolStats = signal<boolean>(false);

  // Block states: User stats
  readonly userStats = signal<UserStats | null>(null);
  readonly loadingUserStats = signal<boolean>(false);
  readonly errorUserStats = signal<boolean>(false);

  // Block states: Spaces count
  readonly spacesTotal = signal<number | null>(null);
  readonly loadingSpaces = signal<boolean>(false);
  readonly errorSpaces = signal<boolean>(false);

  // Block states: Documents stats
  readonly docStats = signal<DocumentStats | null>(null);
  readonly loadingDocStats = signal<boolean>(false);
  readonly errorDocStats = signal<boolean>(false);

  // Block states: Recent activity
  readonly recentActivity = signal<AuditLogItem[]>([]);
  readonly loadingActivity = signal<boolean>(false);
  readonly errorActivity = signal<boolean>(false);

  // Block states: Schools overview (top 5)
  readonly topSchools = signal<School[]>([]);
  readonly loadingSchools = signal<boolean>(false);
  readonly errorSchools = signal<boolean>(false);

  // Computed role slices for the donut chart
  readonly roleSlices = computed<RoleSlice[]>(() => {
    const stats = this.userStats();
    if (!stats || !stats.byRole) return [];

    const total = stats.users?.total ?? 0;
    if (total <= 0) return [];

    const roleDefinitions: { key: keyof typeof stats.byRole; label: string; color: string }[] = [
      { key: 'platform_admin', label: this.i18n.roles.platform_admin, color: '#3B82F6' },
      { key: 'school_admin', label: this.i18n.roles.school_admin, color: '#60A5FA' },
      { key: 'staff', label: this.i18n.roles.staff, color: '#93C5FD' },
      { key: 'student', label: this.i18n.roles.student, color: '#1D4ED8' },
      { key: 'guest', label: this.i18n.roles.guest, color: '#A78BFA' },
    ];

    return roleDefinitions
      .map((def) => {
        const count = stats.byRole[def.key] ?? 0;
        const percentage = Math.round((count / total) * 100);
        return {
          role: def.key,
          count,
          label: def.label,
          percentage,
          color: def.color,
        };
      })
      .filter((slice) => slice.count > 0);
  });

  // Conic gradient for SVG donut
  readonly donutConicGradient = computed<string>(() => {
    const slices = this.roleSlices();
    const stats = this.userStats();
    const total = stats?.users?.total ?? 0;

    if (!slices.length || total === 0) {
      return '#E2E8F0';
    }

    let currentPercent = 0;
    const parts: string[] = [];

    for (const slice of slices) {
      const slicePercent = (slice.count / total) * 100;
      const start = currentPercent;
      const end = currentPercent + slicePercent;
      parts.push(`${slice.color} ${start.toFixed(1)}% ${end.toFixed(1)}%`);
      currentPercent = end;
    }

    return `conic-gradient(${parts.join(', ')})`;
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    if (this.showSchoolsCard() || this.showProgramsCard()) {
      this.loadSchoolStats();
    }
    if (this.showUsersCard() || this.showRoleDistribution()) {
      this.loadUserStats();
    }
    if (this.showSpacesCard()) {
      this.loadSpacesCount();
    }
    if (this.showDocumentsCard()) {
      this.loadDocumentStats();
    }
    if (this.showActivity()) {
      this.loadRecentActivity();
    }
    if (this.showSchoolsOverview()) {
      this.loadTopSchools();
    }
  }

  loadSchoolStats(): void {
    this.loadingSchoolStats.set(true);
    this.errorSchoolStats.set(false);
    this.schoolsApi.getStats().subscribe({
      next: (stats) => {
        this.schoolStats.set(stats);
        this.loadingSchoolStats.set(false);
      },
      error: () => {
        this.errorSchoolStats.set(true);
        this.loadingSchoolStats.set(false);
      },
    });
  }

  loadUserStats(): void {
    this.loadingUserStats.set(true);
    this.errorUserStats.set(false);
    this.usersApi.getStats().subscribe({
      next: (stats) => {
        this.userStats.set(stats);
        this.loadingUserStats.set(false);
      },
      error: () => {
        this.errorUserStats.set(true);
        this.loadingUserStats.set(false);
      },
    });
  }

  loadSpacesCount(): void {
    this.loadingSpaces.set(true);
    this.errorSpaces.set(false);
    this.spacesApi.getSpaces({ limit: 1 }).subscribe({
      next: (res) => {
        this.spacesTotal.set(res?.meta?.total ?? (res?.data ? res.data.length : 0));
        this.loadingSpaces.set(false);
      },
      error: () => {
        this.errorSpaces.set(true);
        this.loadingSpaces.set(false);
      },
    });
  }

  loadDocumentStats(): void {
    this.loadingDocStats.set(true);
    this.errorDocStats.set(false);
    this.documentsApi.getStats().subscribe({
      next: (stats) => {
        this.docStats.set(stats);
        this.loadingDocStats.set(false);
      },
      error: () => {
        this.errorDocStats.set(true);
        this.loadingDocStats.set(false);
      },
    });
  }

  loadRecentActivity(): void {
    this.loadingActivity.set(true);
    this.errorActivity.set(false);
    this.auditApi.getAuditLogs({ limit: 5 }).subscribe({
      next: (res) => {
        this.recentActivity.set(res?.data || []);
        this.loadingActivity.set(false);
      },
      error: () => {
        this.errorActivity.set(true);
        this.loadingActivity.set(false);
      },
    });
  }

  loadTopSchools(): void {
    this.loadingSchools.set(true);
    this.errorSchools.set(false);
    this.schoolsApi.getSchools({ limit: 5 }).subscribe({
      next: (res) => {
        this.topSchools.set(res?.data || []);
        this.loadingSchools.set(false);
      },
      error: () => {
        this.errorSchools.set(true);
        this.loadingSchools.set(false);
      },
    });
  }

  // Formatters
  getActionLabel(action: string): string {
    switch (action) {
      case 'login_success':
        return this.i18n.auditPage.filters.loginSuccess;
      case 'login_failure':
        return this.i18n.auditPage.filters.loginFailure;
      case 'logout':
        return this.i18n.auditPage.filters.logout;
      default:
        return action;
    }
  }

  getUserDisplay(user: { firstName?: string; lastName?: string } | null | undefined): string {
    if (!user) {
      return this.i18n.dashboard.activity.anonymous;
    }
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || this.i18n.dashboard.activity.anonymous;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  }
}
