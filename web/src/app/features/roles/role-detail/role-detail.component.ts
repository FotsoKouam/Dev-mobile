import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SidePanelComponent } from '../../../shared/ui/side-panel/side-panel.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { Role } from '../../../core/api/models/role.model';
import { User } from '../../../core/api/models/user.model';
import { RolesApiService } from '../../../core/api/roles-api.service';
import { I18N_FR } from '../../../shared/i18n/fr';

export type RoleDetailTab = 'informations' | 'permissions' | 'utilisateurs';

@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SidePanelComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    @if (role) {
      <app-side-panel
        [isOpen]="isOpen"
        [title]="roleDisplayName"
        [subtitle]="role.description || ''"
        (closePanel)="close()"
      >
        <!-- Header custom icon & badge -->
        <div headerIcon class="role-header-icon-box" [class.system-box]="role.isSystem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <div headerBadge class="header-badges-row">
          <span class="type-pill" [class.system]="role.isSystem" [class.custom]="!role.isSystem">
            {{ role.isSystem ? i18n.rolesPage.detail.systemBadge : i18n.rolesPage.detail.customBadge }}
          </span>
          <app-status-badge [status]="role.status"></app-status-badge>
        </div>

        <!-- Onglets -->
        <div class="panel-tabs" role="tablist">
          <button
            class="tab-btn"
            [class.active]="currentTab() === 'informations'"
            (click)="selectTab('informations')"
            role="tab"
          >
            {{ i18n.rolesPage.detail.tabs.info }}
          </button>
          <button
            class="tab-btn"
            [class.active]="currentTab() === 'permissions'"
            (click)="selectTab('permissions')"
            role="tab"
          >
            {{ i18n.rolesPage.detail.tabs.permissions }}
            @if (role.permissions.length > 0) {
              <span class="tab-pill">{{ role.permissions.length }}</span>
            }
          </button>
          <button
            class="tab-btn"
            [class.active]="currentTab() === 'utilisateurs'"
            (click)="selectTab('utilisateurs')"
            role="tab"
          >
            {{ i18n.rolesPage.detail.tabs.users }}
            <span class="tab-pill">{{ role.usersCount }}</span>
          </button>
        </div>

        <!-- 1. Onglet Informations -->
        @if (currentTab() === 'informations') {
          <div class="tab-pane info-pane">
            <div class="pane-section-header">
              <span class="section-title">{{ i18n.rolesPage.detail.tabs.info }}</span>
              @if (canManageRoles && !role.isSystem) {
                <button class="btn-link-action" (click)="editRole.emit(role)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>{{ i18n.rolesPage.detail.infoSection.editBtn }}</span>
                </button>
              }
            </div>

            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ i18n.rolesPage.detail.infoSection.code }}</span>
                <span class="info-value font-mono">{{ role.code }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.rolesPage.detail.infoSection.type }}</span>
                <span class="info-value">
                  <span class="type-pill" [class.system]="role.isSystem" [class.custom]="!role.isSystem">
                    {{ role.isSystem ? i18n.rolesPage.detail.systemBadge : i18n.rolesPage.detail.customBadge }}
                  </span>
                </span>
              </div>

              <div class="info-item full-width">
                <span class="info-label">{{ i18n.rolesPage.detail.infoSection.scope }}</span>
                <span class="info-value">{{ roleScopeText }}</span>
              </div>

              <div class="info-item full-width">
                <span class="info-label">{{ i18n.rolesPage.detail.infoSection.description }}</span>
                <span class="info-value text-block">{{ role.description || '—' }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.rolesPage.detail.infoSection.createdAt }}</span>
                <span class="info-value">{{ formattedCreatedAt }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.rolesPage.detail.infoSection.updatedAt }}</span>
                <span class="info-value">{{ formattedUpdatedAt }}</span>
              </div>
            </div>
          </div>
        }

        <!-- 2. Onglet Permissions -->
        @if (currentTab() === 'permissions') {
          <div class="tab-pane permissions-pane">
            <div class="pane-section-header">
              <span class="section-title">{{ i18n.rolesPage.detail.permissionsSection.title }}</span>
              <button class="btn-link-action disabled-action" disabled title="Bientôt disponible">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>{{ i18n.rolesPage.detail.permissionsSection.editBtn }}</span>
              </button>
            </div>

            <div class="permissions-table-wrapper">
              @for (perm of allPermissions; track perm.code) {
                <div class="permission-row" [class.authorized]="hasPermission(perm.code)">
                  <div class="perm-title-group">
                    <svg class="perm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 14 14"></polyline>
                    </svg>
                    <span class="perm-label">{{ perm.label }}</span>
                  </div>
                  <span class="perm-status-pill" [class.allowed]="hasPermission(perm.code)">
                    {{ hasPermission(perm.code) ? i18n.rolesPage.detail.permissionsSection.authorized : i18n.rolesPage.detail.permissionsSection.notAuthorized }}
                  </span>
                </div>
              }
            </div>

            <!-- Périmètre d'accès -->
            <div class="scope-box">
              <span class="scope-box-title">{{ i18n.rolesPage.detail.permissionsSection.scopeTitle }}</span>
              <p class="scope-box-text">{{ roleScopeText }}</p>
            </div>
          </div>
        }

        <!-- 3. Onglet Utilisateurs -->
        @if (currentTab() === 'utilisateurs') {
          <div class="tab-pane users-pane">
            <div class="pane-section-header">
              <span class="section-title">
                {{ i18n.rolesPage.detail.usersSection.title }}
                <span class="text-muted text-sm">({{ role.usersCount }})</span>
              </span>
              <a
                class="btn-link-action"
                [routerLink]="['/users']"
                [queryParams]="{ role: role.code }"
              >
                {{ i18n.rolesPage.detail.usersSection.viewAll }} &rarr;
              </a>
            </div>

            @if (loadingUsers()) {
              <div class="skeleton-box">Chargement des utilisateurs…</div>
            } @else if (users().length === 0) {
              <app-empty-state
                [title]="i18n.rolesPage.detail.usersSection.emptyUsers"
              ></app-empty-state>
            } @else {
              <div class="users-mini-list">
                @for (u of users(); track u.id) {
                  <div class="user-mini-item">
                    <div class="user-mini-avatar">
                      {{ getUserInitials(u) }}
                    </div>
                    <div class="user-mini-info">
                      <span class="user-mini-name">{{ u.lastName }} {{ u.firstName }}</span>
                      <span class="user-mini-email">{{ u.email }}</span>
                    </div>
                    <app-status-badge [status]="u.status"></app-status-badge>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Boutons en bas du panneau -->
        <div class="panel-bottom-bar">
          @if (canManageRoles && !role.isSystem) {
            <button class="btn btn-secondary btn-block" (click)="editRole.emit(role)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>{{ i18n.rolesPage.detail.bottomActions.editRole }}</span>
            </button>

            <button
              class="btn btn-outline-danger btn-block"
              (click)="statusAction.emit(role)"
            >
              @if (role.status === 'active') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="10" y1="15" x2="10" y2="9"></line>
                  <line x1="14" y1="15" x2="14" y2="9"></line>
                </svg>
                <span>{{ i18n.rolesPage.detail.bottomActions.deactivate }}</span>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12l5 5L20 7"></path>
                </svg>
                <span>{{ i18n.rolesPage.detail.bottomActions.reactivate }}</span>
              }
            </button>
          } @else if (role.isSystem) {
            <!-- Rôle système : bouton désactivé avec info-bulle -->
            <button
              class="btn btn-secondary btn-block disabled-btn"
              disabled
              [title]="i18n.rolesPage.detail.bottomActions.systemRoleNotDeactivable"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
              <span>{{ i18n.rolesPage.detail.bottomActions.systemRoleNotDeactivable }}</span>
            </button>
          }
        </div>
      </app-side-panel>
    }
  `,
  styles: [`
    .role-header-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #EBF3FC;
      color: #2F6FED;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .role-header-icon-box.system-box {
      background: #F0F4FA;
      color: #1B2A4A;
    }
    .role-header-icon-box svg {
      width: 22px;
      height: 22px;
    }
    .header-badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .type-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      display: inline-block;
    }
    .type-pill.system {
      background: #EBF3FC;
      color: #2E5C9A;
    }
    .type-pill.custom {
      background: #F3EFF9;
      color: #8C44CC;
    }
    .panel-tabs {
      display: flex;
      border-bottom: 1px solid var(--color-border, #D9DFEA);
      margin-bottom: 20px;
      gap: 16px;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 10px 4px 12px 4px;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-muted, #7A8499);
      cursor: pointer;
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: color 0.15s;
    }
    .tab-btn:hover:not(:disabled) {
      color: var(--color-text-dark, #1B2A4A);
    }
    .tab-btn.active {
      color: var(--color-text-dark, #1B2A4A);
      font-weight: 600;
    }
    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2.5px;
      background: var(--color-primary, #1B2A4A);
    }
    .tab-pill {
      background: #EDF2F9;
      color: var(--color-primary, #1B2A4A);
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .tab-pane {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .pane-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #EEF2F8;
      padding-bottom: 10px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-dark, #1B2A4A);
    }
    .btn-link-action {
      background: none;
      border: none;
      color: var(--color-accent, #4A6FA5);
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 4px;
      text-decoration: none;
    }
    .btn-link-action svg {
      width: 14px;
      height: 14px;
    }
    .disabled-action {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 20px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-item.full-width {
      grid-column: span 2;
    }
    .info-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--color-text-muted, #7A8499);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-value {
      font-size: 13.5px;
      color: var(--color-text-dark, #1B2A4A);
    }
    .font-mono {
      font-family: monospace;
      font-weight: 600;
      color: #2E5C9A;
    }
    .text-block {
      line-height: 1.4;
      background: #F8FAFD;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #EEF2F8;
    }
    .permissions-table-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .permission-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 8px;
      background: #F8FAFD;
      border: 1px solid #EEF2F8;
    }
    .permission-row.authorized {
      background: #FFFFFF;
      border-color: #D9DFEA;
    }
    .perm-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .perm-icon {
      width: 16px;
      height: 16px;
      color: #7A8499;
    }
    .permission-row.authorized .perm-icon {
      color: #3F8F5F;
    }
    .perm-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-dark, #1B2A4A);
    }
    .perm-status-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 12px;
      background: #FDEDEC;
      color: #E85D4E;
    }
    .perm-status-pill.allowed {
      background: rgba(63, 143, 95, 0.12);
      color: #2F6F48;
    }
    .scope-box {
      margin-top: 10px;
      padding: 12px 14px;
      background: #F8FAFD;
      border: 1px solid #EEF2F8;
      border-radius: 8px;
    }
    .scope-box-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-dark, #1B2A4A);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .scope-box-text {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: var(--color-text-muted, #7A8499);
    }
    .users-mini-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .user-mini-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #F8FAFD;
      border-radius: 8px;
      border: 1px solid #EEF2F8;
    }
    .user-mini-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #1B2A4A;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .user-mini-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .user-mini-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
    }
    .user-mini-email {
      font-size: 11.5px;
      color: var(--color-text-muted, #7A8499);
    }
    .skeleton-box {
      padding: 24px;
      text-align: center;
      color: #7A8499;
      font-size: 13px;
    }
    .panel-bottom-bar {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--color-border, #D9DFEA);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s;
    }
    .btn-block {
      width: 100%;
    }
    .btn svg {
      width: 16px;
      height: 16px;
    }
    .btn-secondary {
      background: #FFFFFF;
      border: 1px solid var(--color-border, #D9DFEA);
      color: var(--color-text-dark, #1B2A4A);
    }
    .btn-secondary:hover:not(:disabled) {
      background: #F8FAFD;
    }
    .btn-outline-danger {
      background: #FFFFFF;
      border: 1px solid #E85D4E;
      color: #E85D4E;
    }
    .btn-outline-danger:hover {
      background: #FDEDEC;
    }
    .disabled-btn {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class RoleDetailComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() role?: Role | null;
  @Input() activeTab: RoleDetailTab = 'permissions';
  @Input() canManageRoles = false;

  @Output() closeDetail = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<RoleDetailTab>();
  @Output() editRole = new EventEmitter<Role>();
  @Output() statusAction = new EventEmitter<Role>();

  private readonly api = inject(RolesApiService);
  readonly i18n = I18N_FR;

  readonly currentTab = signal<RoleDetailTab>('permissions');
  readonly users = signal<User[]>([]);
  readonly loadingUsers = signal<boolean>(false);

  private currentRoleUsersCode?: string;

  readonly allPermissions: { code: string; label: string }[] = [
    { code: 'manage_schools', label: I18N_FR.permissions.manage_schools },
    { code: 'manage_programs', label: I18N_FR.permissions.manage_programs },
    { code: 'manage_users', label: I18N_FR.permissions.manage_users },
    { code: 'manage_roles', label: I18N_FR.permissions.manage_roles },
    { code: 'manage_assignments', label: I18N_FR.permissions.manage_assignments },
    { code: 'create_institutional_space', label: I18N_FR.permissions.create_institutional_space },
    { code: 'add_document', label: I18N_FR.permissions.add_document },
    { code: 'replace_or_delete_document', label: I18N_FR.permissions.replace_or_delete_document },
    { code: 'view_audit_log', label: I18N_FR.permissions.view_audit_log },
    { code: 'access_all_schools', label: I18N_FR.permissions.access_all_schools },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['role']) {
      this.currentRoleUsersCode = undefined;
      this.users.set([]);
      if (this.currentTab() === 'utilisateurs' && this.role) {
        this.loadUsers();
      }
    }
    if (changes['activeTab']) {
      this.currentTab.set(this.activeTab);
      if (this.activeTab === 'utilisateurs' && this.role) {
        this.loadUsers();
      }
    }
  }

  get roleDisplayName(): string {
    if (!this.role) return '';
    return (I18N_FR.roles as Record<string, string>)[this.role.code] || this.role.name;
  }

  get roleScopeText(): string {
    if (!this.role) return '';
    switch (this.role.code) {
      case 'platform_admin':
        return this.i18n.rolesPage.scopes.allSchools;
      case 'school_admin':
        return this.i18n.rolesPage.scopes.school;
      case 'staff':
      case 'student':
        return this.i18n.rolesPage.scopes.program;
      case 'guest':
        return this.i18n.rolesPage.scopes.sharedSpaces;
      default:
        return this.role.scope || this.i18n.rolesPage.scopes.custom;
    }
  }

  get formattedCreatedAt(): string {
    if (!this.role?.createdAt) return '—';
    try {
      const d = new Date(this.role.createdAt);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return this.role.createdAt;
    }
  }

  get formattedUpdatedAt(): string {
    if (!this.role?.updatedAt) return '—';
    try {
      const d = new Date(this.role.updatedAt);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return this.role.updatedAt;
    }
  }

  hasPermission(code: string): boolean {
    if (!this.role?.permissions) return false;
    return this.role.permissions.includes(code);
  }

  selectTab(tab: RoleDetailTab): void {
    this.activeTab = tab;
    this.currentTab.set(tab);
    this.tabChange.emit(tab);
    if (tab === 'utilisateurs') {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    if (!this.role) return;
    if (this.currentRoleUsersCode === this.role.code && this.users().length > 0) return;

    this.loadingUsers.set(true);
    this.currentRoleUsersCode = this.role.code;
    this.api.getUsersByRole(this.role.code, 5).subscribe({
      next: (res) => {
        this.users.set(res.data || []);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.users.set([]);
        this.loadingUsers.set(false);
      },
    });
  }

  getUserInitials(user: User): string {
    const f = user.firstName?.[0] || '';
    const l = user.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  }

  close(): void {
    this.closeDetail.emit();
  }
}

