import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="modal-backdrop" (click)="onBackdropClick()"></div>
      <div
        #modalContainer
        class="modal-window"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title"
        tabindex="-1"
      >
        <header class="modal-header">
          <h2 class="modal-title">{{ title }}</h2>
          <button class="close-btn" (click)="close()" aria-label="Fermer la fenêtre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div class="modal-body">
          <ng-content></ng-content>
        </div>

        <footer class="modal-footer">
          <ng-content select="[footer]"></ng-content>
        </footer>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(27, 42, 74, 0.45);
      backdrop-filter: blur(2px);
      z-index: 200;
      animation: fadeIn 0.15s ease;
    }
    .modal-window {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 540px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 48px);
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 20px 48px rgba(27, 42, 74, 0.2);
      z-index: 201;
      display: flex;
      flex-direction: column;
      outline: none;
      animation: scaleIn 0.2s ease-out;
    }
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--color-border, #D9DFEA);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-title {
      font-family: var(--font-family-serif, 'Newsreader', Georgia, serif);
      font-size: 20px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
      margin: 0;
    }
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted, #7A8499);
      padding: 4px;
      display: flex;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .close-btn:hover {
      background: #F0F4FA;
      color: var(--color-text-dark, #1B2A4A);
    }
    .close-btn svg { width: 20px; height: 20px; }
    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--color-border, #D9DFEA);
      background: #F8FAFD;
      border-radius: 0 0 12px 12px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
  `],
})
export class ModalComponent implements AfterViewInit {
  @Input() isOpen = false;
  @Input() title = '';

  @Output() closeModal = new EventEmitter<void>();

  @ViewChild('modalContainer') modalContainer?: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    if (this.isOpen) {
      this.modalContainer?.nativeElement.focus();
    }
  }

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
    this.closeModal.emit();
  }
}

