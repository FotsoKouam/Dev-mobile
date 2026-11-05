import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div class="toast-item">
          <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          <span class="toast-text">{{ toast.text }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 300;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--color-primary, #1B2A4A);
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(27, 42, 74, 0.25);
      font-size: 14px;
      font-weight: 500;
      animation: toastSlideUp 0.2s ease-out;
    }
    .check-icon {
      width: 18px;
      height: 18px;
      color: var(--color-success, #3F8F5F);
    }
    @keyframes toastSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;
}

