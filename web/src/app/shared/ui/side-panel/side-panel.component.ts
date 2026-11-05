import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="panel-backdrop" (click)="onBackdropClick()"></div>
      <aside class="side-panel" role="dialog" aria-modal="true" [attr.aria-label]="title">
        <header class="panel-header">
          <div class="header-left">
            <ng-content select="[headerIcon]"></ng-content>
            <div class="header-titles">
              <h2 class="panel-title">{{ title }}</h2>
              <div class="subtitle-badge-row">
                @if (subtitle) {
                  <div class="panel-subtitle">
                    <svg class="location-pin" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                    </svg>
                    <span>{{ subtitle }}</span>
                  </div>
                }
                <ng-content select="[headerBadge]"></ng-content>
              </div>
            </div>
          </div>
          <div class="header-right">
            <button class="close-btn" (click)="close()" aria-label="Fermer le panneau">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <div class="panel-body">
          <ng-content></ng-content>
        </div>
      </aside>
    }
  `,
  styles: [`
    .panel-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(27, 42, 74, 0.4);
      backdrop-filter: blur(2px);
      z-index: 100;
      animation: fadeIn 0.2s ease;
    }
    .side-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      max-width: 100vw;
      background: #FFFFFF;
      box-shadow: -4px 0 24px rgba(27, 42, 74, 0.15);
      z-index: 101;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s ease-out;
    }
    .panel-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--color-border, #D9DFEA);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      min-width: 0;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .panel-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text-dark, #1B2A4A);
      margin: 0;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .subtitle-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .panel-subtitle {
      font-size: 13px;
      color: var(--color-text-muted, #7A8499);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .location-pin {
      width: 14px;
      height: 14px;
      color: var(--color-text-muted, #7A8499);
      flex-shrink: 0;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted, #7A8499);
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .close-btn:hover {
      background: #F0F4FA;
      color: var(--color-text-dark, #1B2A4A);
    }
    .close-btn svg {
      width: 20px;
      height: 20px;
    }
    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @media (max-width: 1200px) {
      .side-panel {
        width: 100vw;
      }
    }
  `],
})
export class SidePanelComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';

  @Output() closePanel = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  onBackdropClick(): void {
    this.close();
  }

  close(): void {
    this.closePanel.emit();
  }
}

