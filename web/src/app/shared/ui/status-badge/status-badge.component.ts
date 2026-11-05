import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18N_FR } from '../../i18n/fr';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [class.active]="status === 'active'" [class.inactive]="status === 'inactive'">
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
  `],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: 'active' | 'inactive';

  get label(): string {
    return this.status === 'active' ? I18N_FR.status.active : I18N_FR.status.inactive;
  }
}

