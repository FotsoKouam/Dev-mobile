import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidePanelComponent } from '../../../shared/ui/side-panel/side-panel.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { RoleBadgeComponent } from '../../../shared/ui/role-badge/role-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { User, UserRole, UserAssignmentItem } from '../../../core/api/models/user.model';
import { I18N_FR } from '../../../shared/i18n/fr';

export type UserDetailTab = 'informations' | 'roles' | 'affectations' | 'historique';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    SidePanelComponent,
    StatusBadgeComponent,
    RoleBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    @if (user) {
      <app-side-panel
        [isOpen]="isOpen"
        [title]="fullName"
        [subtitle]="user.email"
        (closePanel)="close()"
      >
        <!-- Header custom avatar & badge -->
        <div headerIcon class="user-header-avatar">
          {{ userInitials }}
        </div>
        <div headerBadge>
          <app-status-badge [status]="user.status"></app-status-badge>
        </div>

        <!-- Onglets -->
        <div class="panel-tabs" role="tablist">
          <button
            class="tab-btn"
            [class.active]="currentTab() === 'informations'"
            (click)="selectTab('informations')"
            role="tab"
          >
            {{ i18n.users.detail.tabs.info }}
          </button>
          <button
            class="tab-btn"
            [class.active]="currentTab() === 'roles'"
            (click)="selectTab('roles')"
            role="tab"
          >
            {{ i18n.users.detail.tabs.rolesPermissions }}
          </button>
          <button
            class="tab-btn"
            [class.active]="currentTab() === 'affectations'"
            (click)="selectTab('affectations')"
            role="tab"
          >
            {{ i18n.users.detail.tabs.assignments }}
            @if (assignments().length > 0) {
              <span class="tab-pill">{{ assignments().length }}</span>
            }
          </button>
          <button
            class="tab-btn"
            [class.active]="currentTab() === 'historique'"
            (click)="selectTab('historique')"
            role="tab"
          >
            {{ i18n.users.detail.tabs.history }}
          </button>
        </div>

        <!-- 1. Onglet Informations -->
        @if (currentTab() === 'informations') {
          <div class="tab-pane info-pane">
            <div class="pane-section-header">
              <span class="section-title">{{ i18n.users.detail.infoSection.title }}</span>
              @if (canManageUsers) {
                <button class="btn-link-action" (click)="editUser.emit(user)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>{{ i18n.users.detail.infoSection.editBtn }}</span>
                </button>
              }
            </div>

            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ i18n.users.detail.infoSection.name }}</span>
                <span class="info-value font-medium">{{ user.lastName }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.users.detail.infoSection.authMethod }}</span>
                <span class="info-value">
                  {{ user.authMethod === 'google' ? i18n.users.detail.infoSection.googleAccount : i18n.users.detail.infoSection.passwordAccount }}
                </span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.users.detail.infoSection.firstName }}</span>
                <span class="info-value font-medium">{{ user.firstName }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.users.detail.infoSection.status }}</span>
                <span class="info-value">
                  <app-status-badge [status]="user.status"></app-status-badge>
                </span>
              </div>

              <div class="info-item full-width">
                <span class="info-label">{{ i18n.users.detail.infoSection.email }}</span>
                <span class="info-value">{{ user.email }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.users.detail.infoSection.phone }}</span>
                <span class="info-value">{{ user.phone || i18n.users.detail.infoSection.notSpecified }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.users.detail.infoSection.lastLogin }}</span>
                <span class="info-value">{{ formattedLastLogin }}</span>
              </div>

              <div class="info-item full-width">
                <span class="info-label">{{ i18n.users.detail.infoSection.createdAt }}</span>
                <span class="info-value">{{ formattedCreatedAt }}</span>
              </div>
            </div>

            <!-- Sous-section Espaces accessibles (hors périmètre pour le moment) -->
            <div class="spaces-notice-box">
              <div class="spaces-notice-header">
                <span class="spaces-notice-title">{{ i18n.users.detail.infoSection.spacesTitle }}</span>
              </div>
              <p class="spaces-notice-text">
                {{ i18n.users.detail.infoSection.spacesUpcoming }}
              </p>
            </div>
          </div>
        }

        <!-- 2. Onglet Rôles et permissions -->
        @if (currentTab() === 'roles') {
          <div class="tab-pane roles-pane">
            <div class="pane-section-header">
              <span class="section-title">{{ i18n.users.detail.rolesSection.title }}</span>
              <button class="btn-link-action disabled-action" disabled title="Bientôt disponible">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>{{ i18n.users.detail.rolesSection.editBtn }}</span>
              </button>
            </div>

            <div class="role-current-row">
              <span class="info-label">{{ i18n.users.detail.rolesSection.currentRole }}</span>
              @if (primaryRole) {
                <app-role-badge [role]="primaryRole"></app-role-badge>
              } @else {
                <span class="text-muted">—</span>
              }
            </div>

            <div class="permissions-sub-section">
              <span class="info-label">{{ i18n.users.detail.rolesSection.permissionsTitle }}</span>
              <div class="permissions-list">
                @if (rolePermissions.length > 0) {
                  @for (perm of rolePermissions; track perm) {
                    <div class="permission-item">
                      <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <span>{{ perm }}</span>
                    </div>
                  }
                } @else {
                  <p class="text-muted text-sm">{{ i18n.users.detail.rolesSection.noPermissions }}</p>
                }
              </div>
            </div>
          </div>
        }

        <!-- 3. Onglet Affectations -->
        @if (currentTab() === 'affectations') {
          <div class="tab-pane assignments-pane">
            <div class="pane-section-header">
              <span class="section-title">{{ i18n.users.detail.assignmentsSection.title }}</span>
              <button class="btn-link-action disabled-action" disabled title="Bientôt disponible">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>{{ i18n.users.detail.assignmentsSection.editBtn }}</span>
              </button>
            </div>

            @if (assignments().length === 0) {
              <app-empty-state
                [title]="i18n.users.detail.assignmentsSection.noAssignments"
              ></app-empty-state>
            } @else {
              <div class="assignments-table-wrapper">
                <table class="simple-table">
                  <thead>
                    <tr>
                      <th>{{ i18n.users.detail.assignmentsSection.school }}</th>
                      <th>{{ i18n.users.detail.assignmentsSection.program }}</th>
                      <th>{{ i18n.users.detail.assignmentsSection.role }}</th>
                      <th>{{ i18n.users.detail.assignmentsSection.status }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (ass of assignments(); track ass.id) {
                      <tr>
                        <td class="font-medium">{{ ass.school?.name || 'Toutes les écoles' }}</td>
                        <td>{{ ass.program?.name || '—' }}</td>
                        <td>
                          <app-role-badge [role]="ass.role.code"></app-role-badge>
                        </td>
                        <td>
                          <app-status-badge [status]="ass.status"></app-status-badge>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- 4. Onglet Historique (hors périmètre) -->
        @if (currentTab() === 'historique') {
          <div class="tab-pane">
            <app-empty-state
              [title]="i18n.users.detail.historySection.emptyTitle"
              [description]="i18n.users.detail.historySection.emptyDesc"
            ></app-empty-state>
          </div>
        }

        <!-- Boutons d'action en bas du panneau (si manage_users) -->
        <div class="panel-bottom-bar">
          @if (canManageUsers) {
            <button class="btn btn-secondary btn-block" (click)="editUser.emit(user)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>{{ i18n.users.detail.bottomActions.editAccount }}</span>
            </button>

            @if (!isCurrentConnectedUser) {
              <button
                class="btn btn-outline-danger btn-block"
                (click)="statusAction.emit(user)"
              >
                @if (user.status === 'active') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="10" y1="15" x2="10" y2="9"></line>
                    <line x1="14" y1="15" x2="14" y2="9"></line>
                  </svg>
                  <span>{{ i18n.users.detail.bottomActions.suspend }}</span>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12l5 5L20 7"></path>
                  </svg>
                  <span>{{ i18n.users.detail.bottomActions.reactivate }}</span>
                }
              </button>
            }
          }
        </div>
      </app-side-panel>
    }
  `,
  styles: [`
    .user-header-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #1B2A4A;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 700;
      flex-shrink: 0;
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
    .font-medium {
      font-weight: 600;
    }
    .spaces-notice-box {
      background: #F8FAFD;
      border: 1px solid #EEF2F8;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 6px;
    }
    .spaces-notice-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-dark, #1B2A4A);
    }
    .spaces-notice-text {
      font-size: 12.5px;
      color: var(--color-text-muted, #7A8499);
      margin: 6px 0 0 0;
      line-height: 1.4;
    }
    .role-current-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
    }
    .permissions-sub-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .permissions-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .permission-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--color-text-dark, #1B2A4A);
      background: #F8FAFD;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #EEF2F8;
    }
    .check-icon {
      width: 16px;
      height: 16px;
      color: #3F8F5F;
      flex-shrink: 0;
    }
    .text-muted {
      color: #7A8499;
    }
    .text-sm {
      font-size: 12px;
    }
    .assignments-table-wrapper {
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 8px;
      overflow: hidden;
    }
    .simple-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .simple-table th {
      background: #F8FAFD;
      padding: 10px 12px;
      font-weight: 600;
      color: var(--color-text-muted, #7A8499);
      border-bottom: 1px solid var(--color-border, #D9DFEA);
      text-align: left;
    }
    .simple-table td {
      padding: 12px;
      border-bottom: 1px solid #EEF2F8;
      color: var(--color-text-dark, #1B2A4A);
    }
    .simple-table tr:last-child td {
      border-bottom: none;
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
    .btn-secondary:hover {
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
  `],
})
export class UserDetailComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() user?: User | null;
  @Input() activeTab: UserDetailTab = 'informations';
  @Input() canManageUsers = false;
  @Input() isCurrentConnectedUser = false;

  @Output() closeDetail = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<UserDetailTab>();
  @Output() editUser = new EventEmitter<User>();
  @Output() statusAction = new EventEmitter<User>();

  readonly i18n = I18N_FR;

  readonly currentTab = signal<UserDetailTab>('informations');
  readonly assignments = signal<UserAssignmentItem[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      this.assignments.set(this.user?.assignments || []);
    }
    if (changes['activeTab']) {
      this.currentTab.set(this.activeTab);
    }
  }

  get fullName(): string {
    if (!this.user) return '';
    return `${this.user.firstName} ${this.user.lastName}`.trim();
  }

  get userInitials(): string {
    if (!this.user) return '';
    const first = this.user.firstName?.[0] || '';
    const last = this.user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  }

  get primaryRole(): UserRole | null {
    if (!this.user?.assignments || this.user.assignments.length === 0) return null;
    return this.user.assignments[0].role.code;
  }

  get rolePermissions(): string[] {
    const role = this.primaryRole;
    if (!role) return [];
    // Mappage des permissions connues d'après glossaire
    switch (role) {
      case 'platform_admin':
        return [
          this.i18n.permissions.manage_schools,
          this.i18n.permissions.manage_programs,
          this.i18n.permissions.manage_users,
          this.i18n.permissions.manage_roles,
          this.i18n.permissions.manage_assignments,
          this.i18n.permissions.manage_documents,
          this.i18n.permissions.view_audit_logs,
        ];
      case 'school_admin':
        return [
          this.i18n.permissions.manage_programs,
          this.i18n.permissions.create_institutional_space,
          this.i18n.permissions.manage_users,
          this.i18n.permissions.manage_assignments,
        ];
      case 'staff':
        return [
          this.i18n.permissions.add_document,
          this.i18n.permissions.replace_or_delete_document,
          this.i18n.permissions.view_accessible_documents,
        ];
      case 'student':
      case 'guest':
        return [this.i18n.permissions.view_accessible_documents];
      default:
        return [];
    }
  }

  get formattedLastLogin(): string {
    if (!this.user?.lastLoginAt) return this.i18n.users.table.never;
    try {
      const d = new Date(this.user.lastLoginAt);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return this.user.lastLoginAt;
    }
  }

  get formattedCreatedAt(): string {
    if (!this.user?.createdAt) return '—';
    try {
      const d = new Date(this.user.createdAt);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return this.user.createdAt;
    }
  }

  selectTab(tab: UserDetailTab): void {
    this.activeTab = tab;
    this.currentTab.set(tab);
    this.tabChange.emit(tab);
  }

  close(): void {
    this.closeDetail.emit();
  }
}
