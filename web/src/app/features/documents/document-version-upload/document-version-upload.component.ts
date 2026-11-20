import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { DocumentsApiService } from '../../../core/api/documents-api.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { DocumentItem } from '../../../core/api/models/document.model';
import { I18N_FR } from '../../../shared/i18n/fr';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.heic'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

@Component({
  selector: 'app-document-version-upload',
  standalone: true,
  imports: [CommonModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="i18n.documentsPage.versionUploadModal.title"
      (closeModal)="onCancel()"
    >
      <div class="version-form">
        <!-- Erreur serveur (400, 403, 409, 413) -->
        @if (serverError()) {
          <div class="form-banner-error" role="alert">
            {{ serverError() }}
          </div>
        }

        <!-- Champ Fichier -->
        <app-form-field
          [label]="i18n.documentsPage.versionUploadModal.fileLabel"
          [helpText]="i18n.documentsPage.versionUploadModal.fileHelp"
          [error]="fileError()"
        >
          <div
            class="file-drop-area"
            [class.drag-over]="isDragging()"
            [class.has-file]="selectedFile() !== null"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
          >
            <input
              type="file"
              id="version-file-input"
              class="file-input-hidden"
              accept=".pdf,.jpg,.jpeg,.png,.heic"
              (change)="onFileSelected($event)"
            />

            @if (!selectedFile()) {
              <div class="file-prompt">
                <svg
                  class="upload-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div class="prompt-text">
                  <label for="version-file-input" class="browse-link">Parcourir</label>
                  <span> ou glisser-déposer le nouveau fichier</span>
                </div>
              </div>
            } @else {
              <div class="file-selected-info">
                <div class="file-details">
                  <span class="file-name">{{ selectedFile()?.name }}</span>
                  <span class="file-size">{{ formatSize(selectedFile()?.size || 0) }}</span>
                </div>
                <button
                  type="button"
                  class="btn-remove-file"
                  (click)="removeFile()"
                  title="Supprimer ce fichier"
                >
                  ×
                </button>
              </div>
            }
          </div>
        </app-form-field>

        <!-- Actions -->
        <div class="modal-actions">
          <button
            type="button"
            class="btn-secondary"
            (click)="onCancel()"
            [disabled]="isSubmitting()"
          >
            {{ i18n.documentsPage.versionUploadModal.cancelBtn }}
          </button>
          <button
            type="button"
            class="btn-primary"
            (click)="onSubmit($event)"
            [disabled]="isSubmitting() || !selectedFile()"
          >
            @if (isSubmitting()) {
              <span class="spinner-sm"></span>
              {{ i18n.documentsPage.versionUploadModal.uploadingBtn }}
            } @else {
              {{ i18n.documentsPage.versionUploadModal.submitBtn }}
            }
          </button>
        </div>
      </div>
    </app-modal>
  `,
  styles: [`
    .version-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-banner-error {
      background-color: #fee2e2;
      border: 1px solid #f87171;
      color: #991b1b;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
    }
    .file-drop-area {
      position: relative;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 24px 16px;
      text-align: center;
      background-color: #f8fafc;
      transition: border-color 0.15s, background-color 0.15s;
    }
    .file-drop-area.drag-over {
      border-color: #2f6fed;
      background-color: #eff6ff;
    }
    .file-drop-area.has-file {
      border-style: solid;
      border-color: #94a3b8;
      background-color: #ffffff;
      padding: 16px;
    }
    .file-input-hidden {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
    .file-drop-area.has-file .file-input-hidden {
      display: none;
    }
    .file-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .upload-icon {
      width: 32px;
      height: 32px;
      color: #64748b;
    }
    .prompt-text {
      font-size: 13px;
      color: #64748b;
    }
    .browse-link {
      color: #2f6fed;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }
    .file-selected-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .file-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .file-name {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
      word-break: break-all;
    }
    .file-size {
      font-size: 12px;
      color: #64748b;
    }
    .btn-remove-file {
      background: none;
      border: none;
      font-size: 20px;
      line-height: 1;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .btn-remove-file:hover {
      color: #ef4444;
      background-color: #fee2e2;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      margin-top: 8px;
    }
    .btn-secondary {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background-color: #ffffff;
      color: #334155;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-secondary:hover:not(:disabled) {
      background-color: #f1f5f9;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      background-color: #2f6fed;
      color: #ffffff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #1d4ed8;
    }
    .btn-primary:disabled,
    .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class DocumentVersionUploadComponent {
  @Input() isOpen = false;
  @Input() document: DocumentItem | null = null;
  @Output() versionUploaded = new EventEmitter<DocumentItem>();
  @Output() cancel = new EventEmitter<void>();

  private readonly documentsApi = inject(DocumentsApiService);
  private readonly toastService = inject(ToastService);

  readonly i18n = I18N_FR;

  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly serverError = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    this.fileError.set(null);
    this.serverError.set(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      this.fileError.set(this.i18n.documentsPage.versionUploadModal.errors.invalidExtension);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError.set(this.i18n.documentsPage.versionUploadModal.errors.maxSizeExceeded);
      return;
    }

    this.selectedFile.set(file);
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  formatSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 o';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  onCancel(): void {
    this.resetForm();
    this.cancel.emit();
  }

  onSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const file = this.selectedFile();
    const doc = this.document;

    if (!doc) return;

    if (!file) {
      this.fileError.set(this.i18n.documentsPage.versionUploadModal.errors.fileRequired);
      return;
    }

    this.isSubmitting.set(true);
    this.serverError.set(null);

    this.documentsApi.addDocumentVersion(doc.id, file).subscribe({
      next: (updatedDoc) => {
        this.isSubmitting.set(false);
        this.toastService.success(this.i18n.documentsPage.versionUploadModal.toastSuccess);
        this.resetForm();
        this.versionUploaded.emit(updatedDoc);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const status = err?.status;
        if (status === 413) {
          this.serverError.set(this.i18n.documentsPage.versionUploadModal.errors.payloadTooLarge);
        } else if (status === 409) {
          this.serverError.set(this.i18n.documentsPage.versionUploadModal.errors.conflictDocument);
        } else if (status === 403) {
          this.serverError.set(this.i18n.documentsPage.versionUploadModal.errors.forbidden);
        } else if (status === 400) {
          this.serverError.set(this.i18n.documentsPage.versionUploadModal.errors.typeNotAllowed);
        } else {
          this.serverError.set(err?.error?.message || 'Une erreur est survenue.');
        }
      },
    });
  }

  private resetForm(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
    this.serverError.set(null);
    this.isSubmitting.set(false);
  }
}
