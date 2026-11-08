import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { User } from '../../../core/api/models/user.model';
import { I18N_FR } from '../../../shared/i18n/fr';

@Component({
  selector: 'app-user-status-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="isSuspend ? i18n.users.statusDialog.suspendTitle : i18n.users.statusDialog.reactivateTitle"
      (closeModal)="cancel()"
    >
      <p class="confirm-message">
        {{ isSuspend ? i18n.users.statusDialog.suspendConfirm : i18n.users.statusDialog.reactivateConfirm }}
      </p>

      <div footer class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">
          {{ i18n.common.cancel }}
        </button>
        <button
          type="button"
          class="btn"
          [class.btn-danger]="isSuspend"
          [class.btn-primary]="!isSuspend"
          [disabled]="loading"
          (click)="confirm()"
        >
          {{ isSuspend ? i18n.users.statusDialog.suspendBtn : i18n.users.statusDialog.reactivateBtn }}
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
export class UserStatusDialogComponent {
  @Input() isOpen = false;
  @Input() user: User | null = null;
  @Input() loading = false;

  @Output() confirmAction = new EventEmitter<{ id: string; status: 'active' | 'suspended' }>();
  @Output() cancelAction = new EventEmitter<void>();

  readonly i18n = I18N_FR;

  get isSuspend(): boolean {
    return this.user?.status === 'active';
  }

  confirm(): void {
    if (!this.user) return;
    const newStatus = this.isSuspend ? 'suspended' : 'active';
    this.confirmAction.emit({ id: this.user.id, status: newStatus });
  }

  cancel(): void {
    this.cancelAction.emit();
  }
}

