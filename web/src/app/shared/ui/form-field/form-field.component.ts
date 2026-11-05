import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="form-field-group">
      @if (label) {
        <label [attr.for]="fieldId" class="field-label">
          {{ label }}
        </label>
      }

      <div class="field-control" [class.has-error]="!!error">
        <ng-content></ng-content>
      </div>

      @if (helpText && !error) {
        <div class="field-help">{{ helpText }}</div>
      }

      @if (error) {
        <p [attr.id]="fieldId ? fieldId + '-error' : null" class="field-error" role="alert">
          {{ error }}
        </p>
      }
    </div>
  `,
  styles: [`
    .form-field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 18px;
    }
    .field-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
    }
    .field-help {
      font-size: 12px;
      color: var(--color-text-muted, #7A8499);
    }
    .field-error {
      font-size: 12px;
      font-weight: 500;
      color: var(--color-error, #E85D4E);
      margin: 0;
    }
  `],
})
export class FormFieldComponent {
  @Input() label?: string;
  @Input() fieldId?: string;
  @Input() error?: string | null;
  @Input() helpText?: string;
}

