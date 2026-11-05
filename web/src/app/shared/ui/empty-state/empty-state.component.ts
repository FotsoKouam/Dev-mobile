import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      @if (description) {
        <p class="empty-desc">{{ description }}</p>
      }
      @if (actionLabel) {
        <button class="empty-action-btn" (click)="action.emit()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      text-align: center;
    }
    .empty-icon {
      width: 48px;
      height: 48px;
      color: var(--color-text-light, #9AA5B8);
      margin-bottom: 12px;
    }
    .empty-icon svg { width: 100%; height: 100%; }
    .empty-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
      margin: 0 0 6px 0;
    }
    .empty-desc {
      font-size: 14px;
      color: var(--color-text-muted, #7A8499);
      margin: 0 0 16px 0;
      max-width: 400px;
    }
    .empty-action-btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      background: var(--color-primary, #1B2A4A);
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .empty-action-btn:hover {
      opacity: 0.9;
    }
  `],
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() actionLabel?: string;

  @Output() action = new EventEmitter<void>();
}

