import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-banner" role="alert">
      <div class="error-content">
        <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span class="error-message">{{ message }}</span>
      </div>
      @if (showRetry) {
        <button class="retry-btn" (click)="retry.emit()">
          {{ retryLabel }}
        </button>
      }
    </div>
  `,
  styles: [`
    .error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 20px;
      background: #FDEDEC;
      border: 1px solid rgba(232, 93, 78, 0.3);
      border-radius: 8px;
      color: var(--color-error, #E85D4E);
      margin-bottom: 24px;
    }
    .error-content {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 500;
    }
    .error-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .retry-btn {
      padding: 6px 14px;
      border: 1px solid var(--color-error, #E85D4E);
      border-radius: 6px;
      background: #FFFFFF;
      color: var(--color-error, #E85D4E);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .retry-btn:hover {
      background: var(--color-error, #E85D4E);
      color: #FFFFFF;
    }
  `],
})
export class ErrorBannerComponent {
  @Input() message = 'Impossible de charger les données.';
  @Input() showRetry = true;
  @Input() retryLabel = 'Réessayer';

  @Output() retry = new EventEmitter<void>();
}

