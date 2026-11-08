import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { Assignment } from '../../../core/api/models/assignment.model';
import { I18N_FR } from '../../../shared/i18n/fr';

@Component({
  selector: 'app-assignment-remove-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="i18n.assignmentsPage.removeDialog.title"
      (closeModal)="cancel()"
    >
      <div class="confirm-content">
        <p class="confirm-message">
          {{ i18n.assignmentsPage.removeDialog.confirm }}
        </p>

        @if (assignment) {
          <div class="assignment-summary-box">
            <div class="summary-line">
              <span class="summary-label">Utilisateur :</span>
              <span class="summary-value">{{ assignment.user.firstName }} {{ assignment.user.lastName }}</span>
            </div>
            <div class="summary-line">
              <span class="summary-label">Rôle :</span>
              <span class="summary-value">{{ roleDisplayName }}</span>
            </div>
            @if (assignment.school) {
              <div class="summary-line">
                <span class="summary-label">École :</span>
                <span class="summary-value">{{ assignment.school.name }}</span>
              </div>
            }
            @if (assignment.program) {
              <div class="summary-line">
                <span class="summary-label">Filière :</span>
                <span class="summary-value">{{ assignment.program.name }}</span>
              </div>
            }
          </div>
        }
      </div>

      <div footer class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">
          {{ i18n.assignmentsPage.removeDialog.cancelBtn }}
        </button>
        <button
          type="button"
          class="btn btn-danger"
          [disabled]="loading"
          (click)="confirm()"
        >
          {{ i18n.assignmentsPage.removeDialog.removeBtn }}
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .confirm-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .confirm-message {
      font-size: 14px;
      line-height: 1.5;
      color: var(--color-text-primary, #111827);
      margin: 0;
    }
    .assignment-summary-box {
      background: #F8FAFD;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .summary-line {
      display: flex;
      font-size: 13px;
      gap: 8px;
    }
    .summary-label {
      color: #6B7280;
      min-width: 80px;
    }
    .summary-value {
      color: #111827;
      font-weight: 500;
    }
    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
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
      justify-content: center;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-secondary {
      background: #FFFFFF;
      border-color: #D1D5DB;
      color: #374151;
    }
    .btn-secondary:hover {
      background: #F9FAFB;
    }
    .btn-danger {
      background: #DC2626;
      color: #FFFFFF;
    }
    .btn-danger:hover:not(:disabled) {
      background: #B91C1C;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class AssignmentRemoveDialogComponent {
  @Input() isOpen = false;
  @Input() assignment: Assignment | null = null;
  @Input() loading = false;

  @Output() dialogCancel = new EventEmitter<void>();
  @Output() dialogConfirm = new EventEmitter<Assignment>();

  readonly i18n = I18N_FR;

  get roleDisplayName(): string {
    if (!this.assignment?.role) return '';
    return (
      (this.i18n.roles as Record<string, string>)[this.assignment.role.code] ||
      this.assignment.role.name
    );
  }

  cancel(): void {
    this.dialogCancel.emit();
  }

  confirm(): void {
    if (this.assignment) {
      this.dialogConfirm.emit(this.assignment);
    }
  }
}

