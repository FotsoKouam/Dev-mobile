import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [class.loading]="loading">
      <div class="stat-card-header">
        @if (icon) {
          <div class="stat-icon-wrapper" [ngClass]="iconColorClass">
            @switch (icon) {
              @case ('school') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18M3 7v14M21 7v14M6 21V11M18 21V11M12 21V11M3 7l9-4 9 4"></path>
                </svg>
              }
              @case ('program') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="18" cy="18" r="3"></circle>
                  <circle cx="6" cy="6" r="3"></circle>
                  <path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"></path>
                </svg>
              }
              @case ('user') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              }
              @case ('space') {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              }
            }
          </div>
        }
        <div class="stat-titles">
          <span class="stat-label">{{ label }}</span>
          @if (loading) {
            <div class="skeleton-val"></div>
          } @else {
            <div class="stat-value">{{ value ?? '—' }}</div>
          }
        </div>
      </div>

      <div class="stat-card-footer">
        @if (loading) {
          <div class="skeleton-sub"></div>
        } @else {
          @if (trendText) {
            <div class="stat-trend">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
              <span>{{ trendText }}</span>
            </div>
          }
          @if (subtext) {
            <div class="stat-sub">{{ subtext }}</div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: #ffffff;
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 14px;
      padding: 20px 22px;
      box-shadow: 0 1px 4px rgba(27, 42, 74, 0.03);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 124px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .stat-card:hover {
      box-shadow: 0 4px 12px rgba(27, 42, 74, 0.06);
    }
    .stat-card-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .stat-icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon-wrapper svg {
      width: 22px;
      height: 22px;
    }
    .icon-school { background: #EBF3FC; color: #2E5C9A; }
    .icon-program { background: #EAF7EE; color: #2F6F48; }
    .icon-user { background: #F3EFF9; color: #6A3E9C; }
    .icon-space { background: #FDF4E7; color: #B26A00; }

    .stat-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
    }
    .stat-value {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 32px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
      line-height: 1.1;
    }
    .stat-card-footer {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 14px;
    }
    .stat-trend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      font-weight: 600;
      color: #2F6F48;
    }
    .stat-trend svg {
      width: 13px;
      height: 13px;
    }
    .stat-sub {
      font-size: 12px;
      color: var(--color-text-muted, #7A8499);
    }
    .skeleton-val {
      height: 32px;
      width: 60px;
      background: #E8EEF8;
      border-radius: 6px;
      animation: pulse 1.5s infinite;
    }
    .skeleton-sub {
      height: 14px;
      width: 130px;
      background: #E8EEF8;
      border-radius: 4px;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
  `],
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input() value?: number | string | null;
  @Input() subtext?: string;
  @Input() trendText?: string;
  @Input() icon?: 'school' | 'program' | 'user' | 'space';
  @Input() loading = false;

  get iconColorClass(): string {
    switch (this.icon) {
      case 'school': return 'icon-school';
      case 'program': return 'icon-program';
      case 'user': return 'icon-user';
      case 'space': return 'icon-space';
      default: return 'icon-school';
    }
  }
}
