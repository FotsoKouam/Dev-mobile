import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidePanelComponent } from '../../../shared/ui/side-panel/side-panel.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { I18N_FR } from '../../../shared/i18n/fr';

export type DocumentDetailTab = 'preview' | 'info' | 'access' | 'versions';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, SidePanelComponent, EmptyStateComponent],
  template: `
    <app-side-panel
      [isOpen]="isOpen"
      [title]="i18n.documentsPage.detail.title"
      (closePanel)="onClose()"
    >
      <div class="document-detail-container">
        <!-- Onglets -->
        <div class="detail-tabs">
          <button
            class="tab-btn"
            [class.active]="activeTab === 'preview'"
            (click)="activeTab = 'preview'"
          >
            {{ i18n.documentsPage.detail.tabs.preview }}
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'info'"
            (click)="activeTab = 'info'"
          >
            {{ i18n.documentsPage.detail.tabs.info }}
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'access'"
            (click)="activeTab = 'access'"
          >
            {{ i18n.documentsPage.detail.tabs.access }}
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'versions'"
            (click)="activeTab = 'versions'"
          >
            {{ i18n.documentsPage.detail.tabs.versions }}
          </button>
        </div>

        <!-- Contenu des onglets : tous en état d'attente EmptyState -->
        <div class="tab-content">
          <app-empty-state
            [title]="i18n.common.comingSoon"
            description="La gestion et le détail des documents seront disponibles dans une prochaine version."
          ></app-empty-state>
        </div>

        <!-- Boutons d'action : tous désactivés avec info-bulle Bientôt disponible -->
        <div class="detail-actions-footer">
          <button
            type="button"
            class="btn btn-secondary action-btn"
            disabled
            [title]="i18n.common.comingSoon"
          >
            {{ i18n.documentsPage.detail.actions.download }}
          </button>
          <button
            type="button"
            class="btn btn-secondary action-btn"
            disabled
            [title]="i18n.common.comingSoon"
          >
            {{ i18n.documentsPage.detail.actions.openNewTab }}
          </button>
          <button
            type="button"
            class="btn btn-secondary action-btn"
            disabled
            [title]="i18n.common.comingSoon"
          >
            {{ i18n.documentsPage.detail.actions.replaceVersion }}
          </button>
          <button
            type="button"
            class="btn btn-danger-outline action-btn"
            disabled
            [title]="i18n.common.comingSoon"
          >
            {{ i18n.documentsPage.detail.actions.delete }}
          </button>
        </div>
      </div>
    </app-side-panel>
  `,
  styles: [`
    .document-detail-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: 100%;
    }
    .detail-tabs {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
      gap: 8px;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn:hover {
      color: #1e293b;
    }
    .tab-btn.active {
      color: #2f6fed;
      border-bottom-color: #2f6fed;
    }
    .tab-content {
      flex: 1;
      padding: 10px 0;
    }
    .detail-actions-footer {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .action-btn {
      width: 100%;
      padding: 9px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: not-allowed;
      opacity: 0.6;
      border: 1px solid transparent;
    }
    .btn-secondary {
      background-color: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-danger-outline {
      background-color: transparent;
      color: #dc2626;
      border-color: #fca5a5;
    }
  `],
})
export class DocumentDetailComponent {
  @Input() isOpen = false;
  @Output() panelClosed = new EventEmitter<void>();

  readonly i18n = I18N_FR;
  activeTab: DocumentDetailTab = 'preview';

  onClose(): void {
    this.panelClosed.emit();
  }
}

