import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRole } from '../../../core/api/models/user.model';
import { I18N_FR } from '../../i18n/fr';

@Component({
  selector: 'app-role-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="role-badge" [ngClass]="role">
      {{ label }}
    </span>
  `,
  styles: [`
    .role-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.2;
      width: fit-content;
      white-space: nowrap;
    }
    .role-badge.platform_admin {
      background-color: #E8F0FA;
      color: #2F6FED;
    }
    .role-badge.school_admin {
      background-color: #EBF3FC;
      color: #2E5C9A;
    }
    .role-badge.staff {
      background-color: #F3EFF9;
      color: #8C44CC;
    }
    .role-badge.student {
      background-color: #FEF3E6;
      color: #D97706;
    }
    .role-badge.guest {
      background-color: #FDEDEC;
      color: #E85D4E;
    }
  `],
})
export class RoleBadgeComponent {
  @Input({ required: true }) role!: UserRole;

  get label(): string {
    return (I18N_FR.roles as Record<string, string>)[this.role] || this.role;
  }
}

