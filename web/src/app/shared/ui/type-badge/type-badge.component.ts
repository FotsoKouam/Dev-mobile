import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18N_FR } from '../../i18n/fr';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="type-badge" [class.public]="type === 'public'" [class.private]="type === 'private'">
      {{ label }}
    </span>
  `,
  styles: [`
    .type-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      width: fit-content;
    }
    .type-badge.public {
      background-color: #E8F0FA;
      color: #2E5C9A;
    }
    .type-badge.private {
      background-color: #F0EAF8;
      color: #6A3E9C;
    }
  `],
})
export class TypeBadgeComponent {
  @Input({ required: true }) type!: 'public' | 'private';

  get label(): string {
    return this.type === 'public' ? I18N_FR.type.public : I18N_FR.type.private;
  }
}

