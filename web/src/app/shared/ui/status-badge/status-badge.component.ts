import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18N_FR } from '../../i18n/fr';

export type BadgeStatus = 'active' | 'inactive' | 'suspended' | 'invited';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="status-badge"
      [class.active]="status === 'active'"
      [class.inactive]="status === 'inactive'"
      [class.suspended]="status === 'suspended'"
      [class.invited]="status === 'invited'"
    >
      <span class="dot"></span>
      {{ label }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      width: fit-content;
    }
    .status-badge.active {
      background-color: rgba(63, 143, 95, 0.12);
      color: #2F6F48;
    }
    .status-badge.inactive {
      background-color: rgba(232, 93, 78, 0.12);
      color: #C84638;
    }
    .status-badge.suspended {
      background-color: #FDEDEC;
      color: #E85D4E;
    }
    .status-badge.invited {
      background-color: #FEF7E6;
      color: #B26A00;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .status-badge.active .dot {
      background-color: #3F8F5F;
    }
    .status-badge.inactive .dot {
      background-color: #E85D4E;
    }
    .status-badge.suspended .dot {
      background-color: #E85D4E;
    }
    .status-badge.invited .dot {
      background-color: #D97706;
    }
  `],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: BadgeStatus;

  get label(): string {
    switch (this.status) {
      case 'active':
        return I18N_FR.status.active;
      case 'inactive':
        return I18N_FR.status.inactive;
      case 'suspended':
        return I18N_FR.status.suspended;
      case 'invited':
        return I18N_FR.status.invited;
      default:
        return this.status;
    }
  }
}


