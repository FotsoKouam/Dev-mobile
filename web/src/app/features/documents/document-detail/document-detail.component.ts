import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidePanelComponent } from '../../../shared/ui/side-panel/side-panel.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { DocumentsApiService } from '../../../core/api/documents-api.service';
import { SessionService } from '../../../core/session.service';
import {
  DocumentItem,
  DocumentVersionItem,
} from '../../../core/api/models/document.model';
import { I18N_FR } from '../../../shared/i18n/fr';

export type DocumentDetailTab = 'preview' | 'info' | 'access' | 'versions';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [
    CommonModule,
    SidePanelComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-side-panel
      [isOpen]="isOpen"
      [title]="document?.name || i18n.documentsPage.detail.title"
      [subtitle]="document?.space?.name || ''"
      (closePanel)="onClose()"
    >
      @if (document) {
        <div class="document-detail-container">
          <!-- Bannière d'erreur éventuelle -->
          @if (actionError()) {
            <div class="panel-banner-error" role="alert">
              {{ actionError() }}
            </div>
          }

          <!-- Onglets -->
          <div class="detail-tabs">
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'info'"
              (click)="onSelectTab('info')"
            >
              {{ i18n.documentsPage.detail.tabs.info }}
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'preview'"
              (click)="onSelectTab('preview')"
            >
              {{ i18n.documentsPage.detail.tabs.preview }}
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'access'"
              (click)="onSelectTab('access')"
            >
              {{ i18n.documentsPage.detail.tabs.access }}
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab() === 'versions'"
              (click)="onSelectTab('versions')"
            >
              {{ i18n.documentsPage.detail.tabs.versions }}
            </button>
          </div>

          <!-- Contenu Onglet Informations -->
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
          }

          <!-- Contenu Onglet Historique des versions -->
          @if (activeTab() === 'versions') {
            <div class="versions-content">
              @if (loadingVersions()) {
                <div class="loading-state">
                  <div class="spinner-sm"></div>
                  <span>Chargement de l’historique…</span>
                </div>
              } @else if (errorVersions()) {
                <div class="error-state">
                  <p>{{ i18n.documentsPage.detail.versions.loadError }}</p>
                  <button type="button" class="btn-retry" (click)="loadVersions()">
                    {{ i18n.documentsPage.detail.versions.retry }}
                  </button>
                </div>
              } @else if (versions().length === 0) {
                <div class="empty-state-wrap">
                  <app-empty-state
                    [title]="i18n.documentsPage.detail.versions.empty"
                  ></app-empty-state>
                </div>
              } @else {
                <ul class="versions-list">
                  @for (v of versions(); track v.versionNumber) {
                    <li class="version-item">
                      <div class="version-header">
                        <div class="version-tag-group">
                          <span class="version-num">v{{ v.versionNumber }}</span>
                          @if (v.versionNumber === document.version) {
                            <span class="current-badge">
                              {{ i18n.documentsPage.detail.versions.currentVersionBadge }}
                            </span>
                          }
                        </div>
                        <span class="version-date">{{ formatDate(v.createdAt) }}</span>
                      </div>

                      <div class="version-details">
                        <div class="version-filename">{{ v.originalFilename }}</div>
                        <div class="version-meta">
                          <span>{{ formatSize(v.sizeBytes) }}</span>
                          <span>·</span>
                          <span>{{ v.mimeType }}</span>
                          <span>·</span>
                          <span>{{ v.uploadedBy.name }}</span>
                        </div>
                      </div>

                      @if (document.status === 'available') {
                        <button
                          type="button"
                          class="btn-version-download"
                          (click)="onDownloadVersion(v)"
                          [disabled]="isDownloading()"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          <span>{{ i18n.documentsPage.detail.versions.downloadVersionBtn }}</span>
                        </button>
                      }
                    </li>
                  }
                </ul>
              }
            </div>
          }

          <!-- Contenu Onglets Aperçu et Accès : Bientôt disponible -->
          @if (activeTab() === 'preview' || activeTab() === 'access') {
            <div class="tab-content">
              <app-empty-state
                [title]="i18n.common.comingSoon"
                description="Cette fonctionnalité sera disponible dans une prochaine version."
              ></app-empty-state>
            </div>
          }

          <!-- Actions du panneau -->
          <div class="detail-actions-footer">
            <!-- Bouton Télécharger -->
            @if (canDownload) {
              <button
                type="button"
                class="btn btn-secondary action-btn"
                [class.disabled-btn]="document.status !== 'available' || isDownloading()"
                [disabled]="document.status !== 'available' || isDownloading()"
                [title]="document.status !== 'available' ? i18n.documentsPage.detail.actions.downloadTooltipPending : ''"
                (click)="onDownloadCurrent()"
              >
                @if (isDownloading()) {
                  <span class="spinner-sm"></span>
                  <span>Téléchargement…</span>
                } @else {
                  {{ i18n.documentsPage.detail.actions.download }}
                }
              </button>
            }

            <button
              type="button"
              class="btn btn-secondary action-btn disabled-btn"
              disabled
              [title]="i18n.common.comingSoon"
            >
              {{ i18n.documentsPage.detail.actions.openNewTab }}
            </button>

            <!-- Bouton Remplacer par une nouvelle version -->
            @if (canAddDocument) {
              <button
                type="button"
                class="btn btn-secondary action-btn"
                [class.disabled-btn]="document.status !== 'available'"
                [disabled]="document.status !== 'available'"
                (click)="onOpenReplaceVersion()"
              >
                {{ i18n.documentsPage.detail.actions.replaceVersion }}
              </button>
            }

            <button
              type="button"
              class="btn btn-danger-outline action-btn disabled-btn"
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
    .panel-banner-error {
      background-color: #fee2e2;
      border: 1px solid #f87171;
      color: #991b1b;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
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
    .versions-content {
      flex: 1;
      overflow-y: auto;
      padding: 10px 0;
    }
    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 30px 10px;
      color: #64748b;
      font-size: 13px;
    }
    .btn-retry {
      background: none;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      color: #2f6fed;
      cursor: pointer;
    }
    .versions-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .version-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background-color: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .version-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .version-tag-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .version-num {
      font-weight: 700;
      font-size: 13px;
      color: #1e293b;
    }
    .current-badge {
      background-color: #dbeafe;
      color: #1e40af;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .version-date {
      font-size: 11px;
      color: #94a3b8;
    }
    .version-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .version-filename {
      font-size: 13px;
      font-weight: 500;
      color: #334155;
      word-break: break-all;
    }
    .version-meta {
      font-size: 11px;
      color: #64748b;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .btn-version-download {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #2f6fed;
      font-size: 12px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 4px;
      transition: background 0.15s;
    }
    .btn-version-download:hover:not(:disabled) {
      background: #eff6ff;
    }
    .btn-version-download svg {
      width: 14px;
      height: 14px;
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
      border: 1px solid transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }
    .action-btn.disabled-btn,
    .action-btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
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
    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: #2f6fed;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class DocumentDetailComponent {
  @Input() isOpen = false;
  @Input() document: DocumentItem | null = null;
  @Output() panelClosed = new EventEmitter<void>();
  @Output() replaceVersionRequested = new EventEmitter<DocumentItem>();
  @Output() documentRefreshed = new EventEmitter<DocumentItem>();

  private readonly documentsApi = inject(DocumentsApiService);
  private readonly sessionService = inject(SessionService);

  readonly i18n = I18N_FR;
  readonly activeTab = signal<DocumentDetailTab>('info');

  readonly isDownloading = signal<boolean>(false);
  readonly actionError = signal<string | null>(null);

  readonly versions = signal<DocumentVersionItem[]>([]);
  readonly loadingVersions = signal<boolean>(false);
  readonly errorVersions = signal<boolean>(false);

  get canDownload(): boolean {
    return (
      this.sessionService.hasPermission('manage_programs') ||
      this.sessionService.hasPermission('manage_schools')
    );
  }

  get canAddDocument(): boolean {
    return this.sessionService.hasPermission('add_document');
  }

  onSelectTab(tab: DocumentDetailTab): void {
    this.activeTab.set(tab);
    if (tab === 'versions') {
      this.loadVersions();
    }
  }

  loadVersions(): void {
    if (!this.document) return;

    this.loadingVersions.set(true);
    this.errorVersions.set(false);

    this.documentsApi.getDocumentVersions(this.document.id).subscribe({
      next: (page) => {
        this.versions.set(page.data || []);
        this.loadingVersions.set(false);
      },
      error: () => {
        this.errorVersions.set(true);
        this.loadingVersions.set(false);
      },
    });
  }

  onDownloadCurrent(): void {
    const doc = this.document;
    if (!doc || doc.status !== 'available') return;

    this.actionError.set(null);
    this.isDownloading.set(true);

    this.documentsApi.downloadDocument(doc.id).subscribe({
      next: (blob) => {
        this.isDownloading.set(false);
        this.triggerDownloadBlob(blob, doc.name);
        this.refreshDocumentData();
      },
      error: (err) => {
        this.isDownloading.set(false);
        const status = err?.status;
        if (status === 409) {
          this.actionError.set(this.i18n.documentsPage.detail.errors.conflictError);
        } else if (status === 403) {
          this.actionError.set(this.i18n.documentsPage.detail.errors.forbidden);
        } else {
          this.actionError.set(this.i18n.documentsPage.detail.errors.downloadFailed);
        }
      },
    });
  }

  onDownloadVersion(versionItem: DocumentVersionItem): void {
    const doc = this.document;
    if (!doc || doc.status !== 'available') return;

    this.actionError.set(null);
    this.isDownloading.set(true);

    // Si versionItem possède un id, appeler downloadDocumentVersion, sinon downloadDocument
    const download$ = versionItem.id
      ? this.documentsApi.downloadDocumentVersion(doc.id, versionItem.id)
      : this.documentsApi.downloadDocument(doc.id);

    download$.subscribe({
      next: (blob) => {
        this.isDownloading.set(false);
        this.triggerDownloadBlob(blob, versionItem.originalFilename || doc.name);
      },
      error: (err) => {
        this.isDownloading.set(false);
        const status = err?.status;
        if (status === 409) {
          this.actionError.set(this.i18n.documentsPage.detail.errors.conflictError);
        } else if (status === 403) {
          this.actionError.set(this.i18n.documentsPage.detail.errors.forbidden);
        } else {
          this.actionError.set(this.i18n.documentsPage.detail.errors.downloadFailed);
        }
      },
    });
  }

  private triggerDownloadBlob(blob: Blob, filename: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Ignorer si environnement non DOM (tests)
    }
  }

  refreshDocumentData(): void {
    if (!this.document) return;
    this.documentsApi.getDocument(this.document.id).subscribe({
      next: (freshDoc) => {
        this.document = freshDoc;
        this.documentRefreshed.emit(freshDoc);
      },
      error: () => {},
    });
  }

  onOpenReplaceVersion(): void {
    if (this.document) {
      this.replaceVersionRequested.emit(this.document);
    }
  }

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
    this.actionError.set(null);
    this.panelClosed.emit();
  }
}
