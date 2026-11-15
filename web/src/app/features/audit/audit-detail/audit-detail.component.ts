import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidePanelComponent } from '../../../shared/ui/side-panel/side-panel.component';
import { AuditLogItem } from '../../../core/api/models/audit.model';
import { I18N_FR } from '../../../shared/i18n/fr';

@Component({
  selector: 'app-audit-detail',
  standalone: true,
  imports: [CommonModule, SidePanelComponent],
  template: `
    <app-side-panel
      [isOpen]="isOpen"
      [title]="i18n.auditPage.detail.title"
      (closePanel)="onClose()"
    >
      @if (auditLog) {
        <div class="audit-detail-container">
          <!-- En-tête : icône selon résultat, libellé action et date -->
          <div class="detail-header-card" [class.success]="auditLog.result === 'success'" [class.failure]="auditLog.result === 'failure'">
            <div class="result-icon-badge">
              @if (auditLog.result === 'success') {
                <svg viewBox="0 0 20 20" fill="currentColor" class="icon">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              } @else {
                <svg viewBox="0 0 20 20" fill="currentColor" class="icon">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              }
            </div>
            <div class="header-texts">
              <h3 class="event-title">{{ formatActionLabel(auditLog.action) }}</h3>
              <p class="event-date">{{ formatDateTime(auditLog.createdAt) }}</p>
            </div>
          </div>

          <!-- Section Informations générales -->
          <div class="detail-section">
            <h4 class="section-title">{{ i18n.auditPage.detail.generalInfo }}</h4>
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">{{ i18n.auditPage.detail.user }}</span>
                <span class="info-value">
                  @if (auditLog.user) {
                    <div class="user-cell">
                      <span class="user-fullname">{{ auditLog.user.firstName }} {{ auditLog.user.lastName }}</span>
                      @if (auditLog.user.role) {
                        <span class="user-role">{{ formatRole(auditLog.user.role) }}</span>
                      }
                    </div>
                  } @else {
                    <span class="empty-field">—</span>
                  }
                </span>
              </div>

              <div class="info-row">
                <span class="info-label">{{ i18n.auditPage.detail.action }}</span>
                <span class="info-value">{{ formatActionLabel(auditLog.action) }}</span>
              </div>

              @if (auditLog.details.emailAttempted) {
                <div class="info-row">
                  <span class="info-label">{{ i18n.auditPage.detail.emailAttempted }}</span>
                  <span class="info-value monospace-text">{{ auditLog.details.emailAttempted }}</span>
                </div>
              }

              <div class="info-row">
                <span class="info-label">{{ i18n.auditPage.detail.ipAddress }}</span>
                <span class="info-value monospace-text">{{ auditLog.ipAddress || '—' }}</span>
              </div>

              <div class="info-row">
                <span class="info-label">{{ i18n.auditPage.detail.result }}</span>
                <span class="info-value">
                  <span
                    class="result-badge"
                    [class.badge-success]="auditLog.result === 'success'"
                    [class.badge-failure]="auditLog.result === 'failure'"
                  >
                    {{ auditLog.result === 'success' ? i18n.auditPage.filters.success : i18n.auditPage.filters.failure }}
                  </span>
                </span>
              </div>

              @if (auditLog.details.failureReason) {
                <div class="info-row">
                  <span class="info-label">{{ i18n.auditPage.detail.failureReason }}</span>
                  <span class="info-value failure-reason-text">{{ auditLog.details.failureReason }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Section Informations complémentaires (affichée seulement si userAgent est présent) -->
          @if (auditLog.details.userAgent) {
            <div class="detail-section">
              <h4 class="section-title">{{ i18n.auditPage.detail.additionalInfo }}</h4>
              <div class="info-list">
                <div class="info-row">
                  <span class="info-label">{{ i18n.auditPage.detail.userAgent }}</span>
                  <span class="info-value raw-user-agent">{{ auditLog.details.userAgent }}</span>
                </div>
              </div>
            </div>
          }

          <!-- Mention de non-répudiation et de confidentialité -->
          <div class="security-notice">
            <svg viewBox="0 0 20 20" fill="currentColor" class="notice-icon">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <span>{{ i18n.auditPage.detail.secretsNotice }}</span>
          </div>

          <!-- Bouton Fermer -->
          <div class="detail-actions">
            <button type="button" class="btn btn-secondary close-btn-action" (click)="onClose()">
              {{ i18n.auditPage.detail.close }}
            </button>
          </div>
        </div>
      }
    </app-side-panel>
  `,
  styles: [`
    .audit-detail-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: 100%;
    }
    .detail-header-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 8px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .detail-header-card.success {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }
    .detail-header-card.failure {
      background-color: #fef2f2;
      border-color: #fecaca;
    }
    .result-icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
    }
    .detail-header-card.success .result-icon-badge {
      background-color: #dcfce7;
      color: #15803d;
    }
    .detail-header-card.failure .result-icon-badge {
      background-color: #fee2e2;
      color: #dc2626;
    }
    .icon {
      width: 20px;
      height: 20px;
    }
    .header-texts {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .event-title {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }
    .event-date {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin: 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 13px;
      padding: 4px 0;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
      min-width: 140px;
    }
    .info-value {
      color: #1e293b;
      text-align: right;
      word-break: break-word;
      max-width: 260px;
    }
    .user-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .user-fullname {
      font-weight: 600;
      color: #1e293b;
    }
    .user-role {
      font-size: 11px;
      color: #64748b;
    }
    .empty-field {
      color: #94a3b8;
    }
    .monospace-text {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background-color: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .raw-user-agent {
      font-size: 12px;
      color: #334155;
      background-color: #f8fafc;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      text-align: left;
      line-height: 1.4;
    }
    .failure-reason-text {
      color: #dc2626;
      font-weight: 500;
    }
    .result-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success {
      background-color: #dcfce7;
      color: #15803d;
    }
    .badge-failure {
      background-color: #fee2e2;
      color: #dc2626;
    }
    .security-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #64748b;
      background-color: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      margin-top: auto;
    }
    .notice-icon {
      width: 16px;
      height: 16px;
      color: #3b82f6;
      flex-shrink: 0;
    }
    .detail-actions {
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .close-btn-action {
      width: 100%;
      height: 38px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      background-color: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      transition: background-color 0.15s;
    }
    .close-btn-action:hover {
      background-color: #e2e8f0;
    }
  `],
})
export class AuditDetailComponent {
  @Input() isOpen = false;
  @Input() auditLog: AuditLogItem | null = null;
  @Output() panelClosed = new EventEmitter<void>();

  readonly i18n = I18N_FR;

  formatActionLabel(action: string): string {
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

  formatRole(roleCode?: string | null): string {
    if (!roleCode) return '';
    const rolesMap: Record<string, string> = {
      platform_admin: this.i18n.roles.platform_admin,
      school_admin: this.i18n.roles.school_admin,
      staff: this.i18n.roles.staff,
      student: this.i18n.roles.student,
    };
    return rolesMap[roleCode] || roleCode;
  }

  formatDateTime(isoStr?: string): string {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  }

  onClose(): void {
    this.panelClosed.emit();
  }
}
