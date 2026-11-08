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
import { SidePanelComponent } from '../../../shared/ui/side-panel/side-panel.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { RoleBadgeComponent } from '../../../shared/ui/role-badge/role-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { Assignment } from '../../../core/api/models/assignment.model';
import { UserAssignmentItem } from '../../../core/api/models/user.model';
import { AssignmentsApiService } from '../../../core/api/assignments-api.service';
import { I18N_FR } from '../../../shared/i18n/fr';

export type AssignmentDetailTab = 'assignment' | 'history';

@Component({
  selector: 'app-assignment-detail',
  standalone: true,
  imports: [
    CommonModule,
    SidePanelComponent,
    StatusBadgeComponent,
    RoleBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    @if (assignment) {
      <app-side-panel
        [isOpen]="isOpen"
        [title]="userFullName"
        [subtitle]="assignment.user.email"
        (closePanel)="close()"
      >
        <!-- Header custom icon -->
        <div headerIcon class="user-avatar-circle">
          <span>{{ userInitials }}</span>
        </div>

        <!-- Header badge -->
        <div headerBadge class="header-badges-row">
          <app-status-badge [status]="assignment.status"></app-status-badge>
        </div>

        <!-- Onglets -->
        <div class="tabs-nav-bar">
          <button
            type="button"
            class="tab-btn"
            [class.active]="currentTab() === 'assignment'"
            (click)="selectTab('assignment')"
          >
            {{ i18n.assignmentsPage.detail.tabs.assignment }}
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="currentTab() === 'history'"
            (click)="selectTab('history')"
          >
            {{ i18n.assignmentsPage.detail.tabs.history }}
          </button>
        </div>

        <!-- Contenu des onglets -->
        <div class="tab-body">
          @if (currentTab() === 'assignment') {
            <!-- 1. Affectation principale -->
            <section class="detail-section">
              <h3 class="section-title">
                {{ i18n.assignmentsPage.detail.mainSection.title }}
              </h3>
              <div class="info-grid">
                <div class="info-row">
                  <div class="info-label-with-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 21h18M3 7v14M21 7v14M6 21V11M18 21V11M12 21V11M3 7l9-4 9 4"></path>
                    </svg>
                    <span>{{ i18n.assignmentsPage.detail.mainSection.school }}</span>
                  </div>
                  <div class="info-val bold">
                    {{ assignment.school ? assignment.school.name : '—' }}
                  </div>
                </div>

                <div class="info-row">
                  <div class="info-label-with-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="18" cy="18" r="3"></circle>
                      <circle cx="6" cy="6" r="3"></circle>
                      <path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"></path>
                    </svg>
                    <span>{{ i18n.assignmentsPage.detail.mainSection.program }}</span>
                  </div>
                  <div class="info-val">
                    {{ assignment.program ? assignment.program.name : (assignment.role.code === 'school_admin' ? i18n.assignmentsPage.table.allPrograms : '—') }}
                  </div>
                </div>

                <div class="info-row">
                  <div class="info-label-with-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>{{ i18n.assignmentsPage.detail.mainSection.role }}</span>
                  </div>
                  <div class="info-val">
                    <app-role-badge [role]="assignment.role.code"></app-role-badge>
                  </div>
                </div>
              </div>
            </section>

            <!-- 2. Espaces accessibles -->
            <section class="detail-section">
              <h3 class="section-title">
                {{ i18n.assignmentsPage.detail.spacesSection.title }}
              </h3>
              <p class="coming-soon-notice">
                {{ i18n.assignmentsPage.detail.spacesSection.comingSoon }}
              </p>
            </section>

            <!-- 3. Autres affectations -->
            <section class="detail-section">
              <h3 class="section-title">
                {{ i18n.assignmentsPage.detail.otherAssignmentsSection.title }}
              </h3>
              @if (loadingOtherAssignments()) {
                <div class="loading-text">Chargement des affectations…</div>
              } @else if (otherAssignments().length === 0) {
                <p class="empty-muted-text">
                  {{ i18n.assignmentsPage.detail.otherAssignmentsSection.empty }}
                </p>
              } @else {
                <div class="other-assignments-list">
                  @for (oa of otherAssignments(); track oa.id) {
                    <div class="other-assignment-card">
                      <div class="oa-header">
                        <app-role-badge [role]="oa.role.code"></app-role-badge>
                        <app-status-badge [status]="oa.status"></app-status-badge>
                      </div>
                      <div class="oa-body">
                        <span class="oa-school">{{ oa.school?.name || 'Toutes les écoles' }}</span>
                        @if (oa.program) {
                          <span class="oa-program">Filière {{ oa.program.name }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </section>

            <!-- Mention d'information -->
            <div class="info-callout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>{{ i18n.assignmentsPage.detail.notice }}</span>
            </div>
          } @else if (currentTab() === 'history') {
            <!-- Onglet Historique (hors périmètre / audit) -->
            <div class="history-tab-content">
              <app-empty-state
                [title]="i18n.common.comingSoon"
                [description]="i18n.assignmentsPage.detail.historySoon"
              ></app-empty-state>
            </div>
          }
        </div>

        <!-- Footer Actions -->
        @if (canManageAssignments) {
          <div footer class="detail-bottom-actions">
            <button
              type="button"
              class="btn btn-primary"
              (click)="onEdit()"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>{{ i18n.assignmentsPage.detail.actions.edit }}</span>
            </button>

            <button
              type="button"
              class="btn btn-outline-danger"
              [disabled]="isSelfAdmin"
              [title]="isSelfAdmin ? i18n.assignmentsPage.removeDialog.selfAdminError : ''"
              (click)="onRemove()"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>{{ i18n.assignmentsPage.detail.actions.remove }}</span>
            </button>
          </div>
        }
      </app-side-panel>
    }
  `,
  styles: [`
    .user-avatar-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #1B2A4A;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tabs-nav-bar {
      display: flex;
      border-bottom: 1px solid #E5E7EB;
      margin-bottom: 20px;
    }
    .tab-btn {
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #6B7280;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #111827;
    }
    .tab-btn.active {
      color: #1B2A4A;
      border-bottom-color: #1B2A4A;
      font-weight: 600;
    }
    .tab-body {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 14px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .info-label-with-icon {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #6B7280;
    }
    .info-label-with-icon svg {
      width: 16px;
      height: 16px;
      color: #9CA3AF;
    }
    .info-val {
      font-size: 13px;
      color: #111827;
    }
    .info-val.bold {
      font-weight: 600;
    }
    .coming-soon-notice {
      font-size: 13px;
      color: #6B7280;
      font-style: italic;
      margin: 0;
      padding: 12px;
      background: #F8FAFD;
      border-radius: 6px;
    }
    .empty-muted-text {
      font-size: 13px;
      color: #9CA3AF;
      margin: 0;
    }
    .loading-text {
      font-size: 13px;
      color: #6B7280;
    }
    .other-assignments-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .other-assignment-card {
      background: #F8FAFD;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .oa-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .oa-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
      color: #4B5563;
    }
    .oa-school {
      font-weight: 500;
      color: #111827;
    }
    .info-callout {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      background: #EBF3FC;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.4;
      color: #1E40AF;
    }
    .info-callout svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .history-tab-content {
      padding: 20px 0;
    }
    .detail-bottom-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      width: 100%;
    }
    .btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #1B2A4A;
      color: #FFFFFF;
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }
    .btn-outline-danger {
      background: #FFFFFF;
      border-color: #F87171;
      color: #DC2626;
    }
    .btn-outline-danger:hover:not(:disabled) {
      background: #FEF2F2;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class AssignmentDetailComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() assignment: Assignment | null = null;
  @Input() activeTab: AssignmentDetailTab = 'assignment';
  @Input() canManageAssignments = false;
  @Input() currentSessionUserId: string | null = null;

  @Output() closeDetail = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<AssignmentDetailTab>();
  @Output() editAssignment = new EventEmitter<Assignment>();
  @Output() removeAssignment = new EventEmitter<Assignment>();

  private readonly api = inject(AssignmentsApiService);
  readonly i18n = I18N_FR;

  readonly currentTab = signal<AssignmentDetailTab>('assignment');
  readonly otherAssignments = signal<UserAssignmentItem[]>([]);
  readonly loadingOtherAssignments = signal<boolean>(false);

  private lastLoadedUserId?: string;

  get userFullName(): string {
    if (!this.assignment?.user) return '';
    return `${this.assignment.user.firstName} ${this.assignment.user.lastName}`;
  }

  get userInitials(): string {
    if (!this.assignment?.user) return '';
    const f = this.assignment.user.firstName?.[0] || '';
    const l = this.assignment.user.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  }

  get isSelfAdmin(): boolean {
    if (!this.assignment || !this.currentSessionUserId) return false;
    const isSameUser = this.assignment.user.id === this.currentSessionUserId;
    const isAdmin =
      this.assignment.role.code === 'platform_admin' ||
      this.assignment.role.code === 'school_admin';
    return isSameUser && isAdmin;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assignment']) {
      this.lastLoadedUserId = undefined;
      this.otherAssignments.set([]);
      if (this.assignment && this.isOpen) {
        this.loadOtherAssignments();
      }
    }
    if (changes['activeTab']) {
      this.currentTab.set(this.activeTab);
    }
  }

  selectTab(tab: AssignmentDetailTab): void {
    this.activeTab = tab;
    this.currentTab.set(tab);
    this.tabChange.emit(tab);
  }

  loadOtherAssignments(): void {
    if (!this.assignment?.user?.id) return;
    const userId = this.assignment.user.id;
    if (this.lastLoadedUserId === userId) return;

    this.loadingOtherAssignments.set(true);
    this.lastLoadedUserId = userId;

    this.api.getUser(userId).subscribe({
      next: (user) => {
        const others = (user.assignments || []).filter(
          (a) => a.id !== this.assignment?.id
        );
        this.otherAssignments.set(others);
        this.loadingOtherAssignments.set(false);
      },
      error: () => {
        this.otherAssignments.set([]);
        this.loadingOtherAssignments.set(false);
      },
    });
  }

  onEdit(): void {
    if (this.assignment) {
      this.editAssignment.emit(this.assignment);
    }
  }

  onRemove(): void {
    if (this.assignment && !this.isSelfAdmin) {
      this.removeAssignment.emit(this.assignment);
    }
  }

  close(): void {
    this.closeDetail.emit();
  }
}
