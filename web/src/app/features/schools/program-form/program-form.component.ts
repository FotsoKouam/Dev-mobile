import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { Program, CreateProgramDto, UpdateProgramDto } from '../../../core/api/models/school.model';
import { I18N_FR } from '../../../shared/i18n/fr';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="isEdit ? i18n.schools.programForm.editTitle : i18n.schools.programForm.createTitle"
      (closeModal)="close()"
    >
      <form class="program-form" (ngSubmit)="onSubmit()">
        @if (serverError) {
          <div class="form-banner-error" role="alert">
            {{ serverError }}
          </div>
        }

        <!-- 1. Nom de la filière * -->
        <app-form-field
          [label]="i18n.schools.programForm.nameLabel"
          fieldId="program-name"
          [error]="errors.name"
        >
          <input
            id="program-name"
            type="text"
            class="input-control"
            [(ngModel)]="formData.name"
            name="name"
            required
            minlength="1"
            maxlength="150"
            [class.input-error]="!!errors.name"
          />
        </app-form-field>

        <!-- 2. Description (facultative) -->
        <app-form-field
          [label]="i18n.schools.programForm.descLabel"
          fieldId="program-desc"
        >
          <textarea
            id="program-desc"
            class="input-control textarea-control"
            rows="3"
            [(ngModel)]="formData.description"
            name="description"
          ></textarea>
        </app-form-field>
      </form>

      <div footer class="form-actions">
        <button type="button" class="btn btn-secondary" (click)="close()">
          {{ i18n.common.cancel }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="loading"
          (click)="onSubmit()"
        >
          {{ isEdit ? i18n.schools.programForm.submitEdit : i18n.schools.programForm.submitCreate }}
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .program-form {
      display: flex;
      flex-direction: column;
    }
    .input-control {
      width: 100%;
      height: 42px;
      padding: 0 14px;
      border: 1.5px solid var(--color-border, #D9DFEA);
      border-radius: 8px;
      font-size: 14px;
      color: var(--color-text-dark, #1B2A4A);
      background: #FFFFFF;
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .input-control:focus {
      border-color: var(--color-accent, #4A6FA5);
      box-shadow: 0 0 0 3px rgba(74, 111, 165, 0.1);
    }
    .input-error {
      border-color: var(--color-error, #E85D4E);
    }
    .textarea-control {
      height: auto;
      padding: 10px 14px;
      resize: vertical;
    }
    .form-banner-error {
      padding: 10px 14px;
      background: #FDEDEC;
      border: 1px solid rgba(232, 93, 78, 0.3);
      border-radius: 6px;
      color: var(--color-error, #E85D4E);
      font-size: 13px;
      margin-bottom: 16px;
    }
    .form-actions {
      display: flex;
      gap: 12px;
    }
    .btn {
      height: 40px;
      padding: 0 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn-secondary {
      background: #FFFFFF;
      border: 1px solid var(--color-border, #D9DFEA);
      color: var(--color-text-dark, #1B2A4A);
    }
    .btn-secondary:hover {
      background: #F8FAFD;
    }
    .btn-primary {
      background: var(--color-primary, #1B2A4A);
      color: #FFFFFF;
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class ProgramFormComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() programToEdit?: Program | null;
  @Input() loading = false;

  @Output() formSubmit = new EventEmitter<CreateProgramDto | UpdateProgramDto>();
  @Output() formCancel = new EventEmitter<void>();

  readonly i18n = I18N_FR;

  formData = {
    name: '',
    description: '',
  };

  errors: {
    name?: string;
  } = {};

  serverError: string | null = null;

  get isEdit(): boolean {
    return !!this.programToEdit;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['programToEdit'] || changes['isOpen']) {
      if (this.isOpen) {
        this.reset();
      }
    }
  }

  reset(): void {
    this.errors = {};
    this.serverError = null;
    if (this.programToEdit) {
      this.formData = {
        name: this.programToEdit.name,
        description: this.programToEdit.description || '',
      };
    } else {
      this.formData = {
        name: '',
        description: '',
      };
    }
  }

  validate(): boolean {
    this.errors = {};
    this.serverError = null;

    const name = this.formData.name.trim();
    if (!name || name.length < 1 || name.length > 150) {
      this.errors.name = this.i18n.schools.programForm.errors.nameRequired;
      return false;
    }
    return true;
  }

  onSubmit(): void {
    if (!this.validate() || this.loading) {
      return;
    }

    const payload: CreateProgramDto | UpdateProgramDto = {
      name: this.formData.name.trim(),
      description: this.formData.description.trim() || null,
    };

    this.formSubmit.emit(payload);
  }

  handleApiError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        this.errors.name = this.i18n.schools.programForm.errors.conflictName;
      } else if (error.status === 400) {
        const msg = Array.isArray(error.error?.message)
          ? error.error.message.join(', ')
          : error.error?.message || 'Données invalides.';
        this.serverError = msg;
      } else {
        this.serverError = 'Une erreur est survenue lors de l’enregistrement.';
      }
    } else {
      this.serverError = 'Une erreur est survenue lors de l’enregistrement.';
    }
  }

  close(): void {
    this.formCancel.emit();
  }
}

