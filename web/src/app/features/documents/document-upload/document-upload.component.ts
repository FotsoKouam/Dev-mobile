import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { DocumentsApiService } from '../../../core/api/documents-api.service';
import { SpacesApiService } from '../../../core/api/spaces-api.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Space } from '../../../core/api/models/space.model';
import { DocumentItem } from '../../../core/api/models/document.model';
import { I18N_FR } from '../../../shared/i18n/fr';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.heic'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="i18n.documentsPage.uploadModal.title"
      (closeModal)="onCancel()"
    >
      <form class="upload-form" (ngSubmit)="onSubmit()" novalidate>
        <!-- Erreur globale ou serveur (400, 403, 409, 413) -->
        @if (serverError()) {
          <div class="form-banner-error" role="alert">
            {{ serverError() }}
          </div>
        }

        <!-- Espace institutionnel -->
        <app-form-field
          [label]="i18n.documentsPage.uploadModal.spaceLabel"
          [error]="spaceError()"
        >
          <select
            class="form-select"
            [ngModel]="selectedSpaceId()"
            (ngModelChange)="selectedSpaceId.set($event); spaceError.set('')"
            name="spaceId"
            [disabled]="loadingSpaces() || isUploading()"
          >
            <option value="" disabled>
              {{ i18n.documentsPage.uploadModal.spacePlaceholder }}
            </option>
            @for (sp of availableSpaces(); track sp.id) {
              <option [value]="sp.id">
                {{ sp.name }}{{ sp.scopeProgram ? ' (' + sp.scopeProgram.name + ')' : '' }}
              </option>
            }
          </select>
        </app-form-field>

        <!-- Champ fichier -->
        <app-form-field
          [label]="i18n.documentsPage.uploadModal.fileLabel"
          [error]="fileError()"
        >
          <div class="file-input-wrapper">
            <input
              type="file"
              class="form-file-input"
              accept=".pdf,.jpg,.jpeg,.png,.heic"
              (change)="onFileSelected($event)"
              [disabled]="isUploading()"
            />
            @if (selectedFile()) {
              <div class="selected-file-meta">
                <span class="file-name">{{ selectedFile()!.name }}</span>
                <span class="file-size">({{ formatFileSize(selectedFile()!.size) }})</span>
              </div>
            }
          </div>
        </app-form-field>

        <!-- Nom personnalisé facultatif -->
        <app-form-field
          [label]="i18n.documentsPage.uploadModal.nameLabel"
        >
          <input
            type="text"
            class="form-input"
            [placeholder]="i18n.documentsPage.uploadModal.namePlaceholder"
            [ngModel]="customName()"
            (ngModelChange)="customName.set($event)"
            name="documentName"
            maxlength="255"
            [disabled]="isUploading()"
          />
        </app-form-field>

        <!-- Boutons d'action -->
        <div footer class="modal-footer-actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="onCancel()"
            [disabled]="isUploading()"
          >
            {{ i18n.documentsPage.uploadModal.cancelBtn }}
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="isUploading()"
          >
            @if (isUploading()) {
              {{ i18n.documentsPage.uploadModal.uploadingBtn }}
            } @else {
              {{ i18n.documentsPage.uploadModal.submitBtn }}
            }
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [`
    .upload-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-banner-error {
      padding: 10px 14px;
      border-radius: 6px;
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      color: #991B1B;
      font-size: 13px;
    }
    .form-select, .form-input {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      color: #1e293b;
      background-color: #ffffff;
      outline: none;
      box-sizing: border-box;
    }
    .form-select:focus, .form-input:focus {
      border-color: #2f6fed;
    }
    .file-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-file-input {
      font-size: 13px;
      color: #475569;
    }
    .selected-file-meta {
      font-size: 12px;
      color: #64748b;
      display: flex;
      gap: 6px;
    }
    .file-name {
      font-weight: 500;
      color: #1e293b;
    }
    .modal-footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }
    .btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background-color 0.15s;
    }
    .btn-secondary {
      background-color: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-secondary:hover:not(:disabled) {
      background-color: #e2e8f0;
    }
    .btn-primary {
      background-color: #1b2a4a;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #273b66;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `],
})
export class DocumentUploadComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() initialSpaceId?: string;
  @Input() preloadedSpaces: Space[] = [];

  @Output() modalClosed = new EventEmitter<void>();
  @Output() documentUploaded = new EventEmitter<DocumentItem>();

  private readonly documentsApi = inject(DocumentsApiService);
  private readonly spacesApi = inject(SpacesApiService);
  private readonly toast = inject(ToastService);

  readonly i18n = I18N_FR;

  readonly availableSpaces = signal<Space[]>([]);
  readonly loadingSpaces = signal<boolean>(false);
  readonly selectedSpaceId = signal<string>('');
  readonly selectedFile = signal<File | null>(null);
  readonly customName = signal<string>('');
  readonly isUploading = signal<boolean>(false);

  readonly spaceError = signal<string>('');
  readonly fileError = signal<string>('');
  readonly serverError = signal<string>('');

  ngOnInit(): void {
    if (this.isOpen) {
      this.resetForm();
      this.loadSpaces();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
      this.loadSpaces();
    }
  }

  resetForm(): void {
    this.spaceError.set('');
    this.fileError.set('');
    this.serverError.set('');
    this.selectedFile.set(null);
    this.customName.set('');
    this.isUploading.set(false);

    if (this.initialSpaceId) {
      this.selectedSpaceId.set(this.initialSpaceId);
    } else {
      this.selectedSpaceId.set('');
    }
  }

  loadSpaces(): void {
    if (this.preloadedSpaces && this.preloadedSpaces.length > 0) {
      this.availableSpaces.set(this.preloadedSpaces);
      return;
    }

    this.loadingSpaces.set(true);
    this.spacesApi.getSpaces({ limit: 100, status: 'active' }).subscribe({
      next: (page) => {
        this.availableSpaces.set(page?.data || []);
        this.loadingSpaces.set(false);
      },
      error: () => {
        this.availableSpaces.set([]);
        this.loadingSpaces.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.selectedFile.set(null);
      return;
    }

    const file = input.files[0];
    this.fileError.set('');
    this.serverError.set('');

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      this.fileError.set(this.i18n.documentsPage.uploadModal.errors.invalidExtension);
      this.selectedFile.set(null);
      input.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError.set(this.i18n.documentsPage.uploadModal.errors.maxSizeExceeded);
      this.selectedFile.set(null);
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  validate(): boolean {
    let valid = true;
    this.spaceError.set('');
    this.fileError.set('');
    this.serverError.set('');

    if (!this.selectedSpaceId()) {
      this.spaceError.set(this.i18n.documentsPage.uploadModal.errors.spaceRequired);
      valid = false;
    }

    const file = this.selectedFile();
    if (!file) {
      this.fileError.set(this.i18n.documentsPage.uploadModal.errors.fileRequired);
      valid = false;
    }

    return valid;
  }

  onSubmit(): void {
    if (!this.validate()) return;

    const file = this.selectedFile()!;
    const spaceId = this.selectedSpaceId();
    const name = this.customName();

    this.isUploading.set(true);
    this.serverError.set('');

    this.documentsApi.uploadDocument(spaceId, file, name).subscribe({
      next: (uploadedDoc) => {
        this.isUploading.set(false);
        this.toast.success(this.i18n.documentsPage.uploadModal.toastSuccess);
        this.documentUploaded.emit(uploadedDoc);
        this.onCancel();
      },
      error: (err) => {
        this.isUploading.set(false);
        const status = err?.status;
        const msg = err?.error?.message;

        if (status === 400) {
          this.serverError.set(msg || this.i18n.documentsPage.uploadModal.errors.typeNotAllowed);
        } else if (status === 403) {
          this.serverError.set(this.i18n.documentsPage.uploadModal.errors.forbidden);
        } else if (status === 409) {
          this.serverError.set(this.i18n.documentsPage.uploadModal.errors.conflictSpace);
        } else if (status === 413) {
          this.serverError.set(msg || this.i18n.documentsPage.uploadModal.errors.payloadTooLarge);
        } else {
          this.serverError.set(msg || this.i18n.common.errorNetwork);
        }
      },
    });
  }

  onCancel(): void {
    this.modalClosed.emit();
  }
}
