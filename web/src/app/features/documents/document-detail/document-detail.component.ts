import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidePanelComponent } from '../../../shared/ui/side-panel/side-panel.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { DocumentItem } from '../../../core/api/models/document.model';
import { I18N_FR } from '../../../shared/i18n/fr';

export type DocumentDetailTab = 'preview' | 'info' | 'access' | 'versions';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, SidePanelComponent, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <app-side-panel
      [isOpen]="isOpen"
      [title]="document?.name || i18n.documentsPage.detail.title"
      [subtitle]="document?.space?.name || ''"
      (closePanel)="onClose()"
    >
      @if (document) {
        <div class="document-detail-container">
          <!-- Onglets -->
          <div class="detail-tabs">
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'info'"
              (click)="activeTab.set('info')"
            >
              {{ i18n.documentsPage.detail.tabs.info }}
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'preview'"
              (click)="activeTab.set('preview')"
            >
              {{ i18n.documentsPage.detail.tabs.preview }}
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'access'"
              (click)="activeTab.set('access')"
            >
              {{ i18n.documentsPage.detail.tabs.access }}
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'versions'"
              (click)="activeTab.set('versions')"
            >
              {{ i18n.documentsPage.detail.tabs.versions }}
            </button>
          </div>

          <!-- Contenu Onglet Informations : Réel -->
          @if (activeTab() === 'info') {
            <div class="info-grid">
              <div class="info-row">
                <span class="info-label">Nom</span>
                <span class="info-value font-medium">{{ document.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Type</span>
                <span class="info-value badge-type">{{ document.fileType.toUpperCase() }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Taille</span>
                <span class="info-value">{{ formatSize(document.sizeBytes) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Version</span>
                <span class="info-value">v{{ document.version }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Statut</span>
                <span class="info-value">
                  <app-status-badge [status]="document.status"></app-status-badge>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Espace</span>
                <span class="info-value">{{ document.space.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Filière</span>
                <span class="info-value">{{ document.program?.name || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">École</span>
                <span class="info-value">{{ document.school?.name || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Ajouté par</span>
                <span class="info-value">{{ document.uploadedBy.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date d’ajout</span>
                <span class="info-value">{{ formatDate(document.createdAt) }}</span>
              </div>
            </div>
          } @else {
            <!-- Aperçu, Accès, Historique des versions : Bientôt disponible -->
            <div class="tab-content">
              <app-empty-state
                [title]="i18n.common.comingSoon"
                description="Cette fonctionnalité sera disponible dans une prochaine version."
              ></app-empty-state>
            </div>
          }

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
      }
    </app-side-panel>
  `,
  styles: [`
    .document-detail-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
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
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 10px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-value {
      color: #1e293b;
      text-align: right;
    }
    .font-medium {
      font-weight: 600;
    }
    .badge-type {
      background-color: #e2e8f0;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
    .tab-content {
      flex: 1;
      padding: 20px 0;
    }
    .detail-actions-footer {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      margin-top: auto;
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
  @Input() document: DocumentItem | null = null;
  @Output() panelClosed = new EventEmitter<void>();

  readonly i18n = I18N_FR;
  readonly activeTab = signal<DocumentDetailTab>('info');

  formatSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 o';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  onClose(): void {
    this.panelClosed.emit();
  }
}
