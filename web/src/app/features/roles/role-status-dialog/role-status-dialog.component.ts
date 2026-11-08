import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { Role } from '../../../core/api/models/role.model';
import { I18N_FR } from '../../../shared/i18n/fr';

@Component({
  selector: 'app-role-status-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="isDeactivate ? i18n.rolesPage.statusDialog.deactivateTitle : i18n.rolesPage.statusDialog.reactivateTitle"
      (closeModal)="cancel()"
    >
      <p class="confirm-message">
        {{ isDeactivate ? i18n.rolesPage.statusDialog.deactivateConfirm : i18n.rolesPage.statusDialog.reactivateConfirm }}
      </p>

      <div footer class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">
          {{ i18n.common.cancel }}
        </button>
        <button
          type="button"
          class="btn"
          [class.btn-danger]="isDeactivate"
          [class.btn-primary]="!isDeactivate"
          [disabled]="loading || (role?.isSystem ?? false)"
          (click)="confirm()"
        >
          {{ isDeactivate ? i18n.rolesPage.statusDialog.deactivateBtn : i18n.rolesPage.statusDialog.reactivateBtn }}
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .confirm-message {
      font-size: 14px;
      line-height: 1.5;
      color: var(--color-text-dark, #1B2A4A);
      margin: 0;
    }
    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      transition: all 0.15s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #FFFFFF;
      border: 1px solid var(--color-border, #D9DFEA);
      color: var(--color-text-dark, #1B2A4A);
    }
    .btn-secondary:hover:not(:disabled) {
      background: #F8FAFD;
    }
    .btn-danger {
      background: #E85D4E;
      color: #FFFFFF;
    }
    .btn-danger:hover:not(:disabled) {
      opacity: 0.9;
    }
    .btn-primary {
      background: var(--color-primary, #1B2A4A);
      color: #FFFFFF;
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }
  `],
})
export class RoleStatusDialogComponent {
  @Input() isOpen = false;
  @Input() role: Role | null = null;
  @Input() loading = false;

  @Output() confirmAction = new EventEmitter<{ id: string; status: 'active' | 'inactive' }>();
  @Output() cancelAction = new EventEmitter<void>();

  readonly i18n = I18N_FR;

  get isDeactivate(): boolean {
    return this.role?.status === 'active';
  }

  confirm(): void {
    if (!this.role || this.role.isSystem) return;
    const newStatus = this.isDeactivate ? 'inactive' : 'active';
    this.confirmAction.emit({ id: this.role.id, status: newStatus });
  }

  cancel(): void {
    this.cancelAction.emit();
  }
}

