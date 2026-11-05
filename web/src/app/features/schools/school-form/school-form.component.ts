import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { School, CreateSchoolDto, UpdateSchoolDto, SchoolType } from '../../../core/api/models/school.model';
import { I18N_FR } from '../../../shared/i18n/fr';

@Component({
  selector: 'app-school-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="isEdit ? i18n.schools.form.editTitle : i18n.schools.form.createTitle"
      (closeModal)="close()"
    >
      <form class="school-form" (ngSubmit)="onSubmit()">
        @if (serverError) {
          <div class="form-banner-error" role="alert">
            {{ serverError }}
          </div>
        }

        <!-- 1. Nom de l'école * -->
        <app-form-field
          [label]="i18n.schools.form.nameLabel"
          fieldId="school-name"
          [error]="errors.name"
        >
          <input
            id="school-name"
            type="text"
            class="input-control"
            [(ngModel)]="formData.name"
            name="name"
            required
            minlength="2"
            maxlength="150"
            [class.input-error]="!!errors.name"
          />
        </app-form-field>

        <!-- 2. Type * -->
        <app-form-field
          [label]="i18n.schools.form.typeLabel"
          [error]="errors.type"
        >
          <div class="radio-group">
            <label class="radio-label">
              <input
                type="radio"
                name="type"
                value="public"
                [(ngModel)]="formData.type"
              />
              <span>{{ i18n.type.public }}</span>
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="type"
                value="private"
                [(ngModel)]="formData.type"
              />
              <span>{{ i18n.type.private }}</span>
            </label>
          </div>
        </app-form-field>

        <!-- 3. Ville * -->
        <app-form-field
          [label]="i18n.schools.form.cityLabel"
          fieldId="school-city"
          [error]="errors.city"
        >
          <input
            id="school-city"
            type="text"
            class="input-control"
            [(ngModel)]="formData.city"
            name="city"
            required
            [class.input-error]="!!errors.city"
          />
        </app-form-field>

        <!-- 4. Adresse -->
        <app-form-field
          [label]="i18n.schools.form.addressLabel"
          fieldId="school-address"
        >
          <input
            id="school-address"
            type="text"
            class="input-control"
            [(ngModel)]="formData.address"
            name="address"
          />
        </app-form-field>

        <!-- 5. Téléphone -->
        <app-form-field
          [label]="i18n.schools.form.phoneLabel"
          fieldId="school-phone"
        >
          <input
            id="school-phone"
            type="tel"
            class="input-control"
            [(ngModel)]="formData.phone"
            name="phone"
          />
        </app-form-field>

        <!-- 6. Description (3 lignes) -->
        <app-form-field
          [label]="i18n.schools.form.descLabel"
          fieldId="school-desc"
        >
          <textarea
            id="school-desc"
            class="input-control textarea-control"
            rows="3"
            [(ngModel)]="formData.description"
            name="description"
          ></textarea>
        </app-form-field>

        <!-- 7. Domaine Google Workspace -->
        <app-form-field
          [label]="i18n.schools.form.domainLabel"
          fieldId="school-domain"
          [helpText]="i18n.schools.form.domainHelp"
          [error]="errors.domain"
        >
          <input
            id="school-domain"
            type="text"
            class="input-control"
            [placeholder]="i18n.schools.form.domainPlaceholder"
            [(ngModel)]="formData.googleWorkspaceDomain"
            name="domain"
            [class.input-error]="!!errors.domain"
          />
        </app-form-field>

        <!-- 8. Langue principale -->
        <app-form-field
          [label]="i18n.schools.form.langLabel"
          fieldId="school-lang"
        >
          <select
            id="school-lang"
            class="input-control select-control"
            [(ngModel)]="formData.mainLanguage"
            name="mainLanguage"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
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
          {{ isEdit ? i18n.schools.form.submitEdit : i18n.schools.form.submitCreate }}
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .school-form {
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
    .select-control {
      cursor: pointer;
    }
    .radio-group {
      display: flex;
      gap: 24px;
      padding: 8px 0;
    }
    .radio-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--color-text-dark, #1B2A4A);
      cursor: pointer;
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
export class SchoolFormComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() schoolToEdit?: School | null;
  @Input() loading = false;

  @Output() formSubmit = new EventEmitter<CreateSchoolDto | UpdateSchoolDto>();
  @Output() formCancel = new EventEmitter<void>();

  readonly i18n = I18N_FR;

  formData: {
    name: string;
    type: SchoolType;
    city: string;
    address: string;
    phone: string;
    description: string;
    googleWorkspaceDomain: string;
    mainLanguage: string;
  } = this.initialData();

  errors: {
    name?: string;
    type?: string;
    city?: string;
    domain?: string;
  } = {};

  serverError: string | null = null;

  get isEdit(): boolean {
    return !!this.schoolToEdit;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schoolToEdit'] || changes['isOpen']) {
      if (this.isOpen) {
        this.reset();
      }
    }
  }

  private initialData() {
    return {
      name: '',
      type: 'public' as SchoolType,
      city: '',
      address: '',
      phone: '',
      description: '',
      googleWorkspaceDomain: '',
      mainLanguage: 'fr',
    };
  }

  reset(): void {
    this.errors = {};
    this.serverError = null;

    if (this.schoolToEdit) {
      this.formData = {
        name: this.schoolToEdit.name,
        type: this.schoolToEdit.type,
        city: this.schoolToEdit.city,
        address: this.schoolToEdit.address || '',
        phone: this.schoolToEdit.phone || '',
        description: this.schoolToEdit.description || '',
        googleWorkspaceDomain: this.schoolToEdit.googleWorkspaceDomain || '',
        mainLanguage: this.schoolToEdit.mainLanguage || 'fr',
      };
    } else {
      this.formData = this.initialData();
    }
  }

  validate(): boolean {
    this.errors = {};
    this.serverError = null;
    let valid = true;

    const name = this.formData.name.trim();
    if (!name || name.length < 2 || name.length > 150) {
      this.errors.name = this.i18n.schools.form.errors.nameRequired;
      valid = false;
    }

    if (!this.formData.city.trim()) {
      this.errors.city = this.i18n.schools.form.errors.cityRequired;
      valid = false;
    }

    const domain = this.formData.googleWorkspaceDomain.trim();
    if (domain) {
      // pas de majuscule, pas d'@, pas d'espace
      const domainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/;
      if (domain.includes('@') || domain.includes(' ') || /[A-Z]/.test(domain) || !domainRegex.test(domain)) {
        this.errors.domain = this.i18n.schools.form.errors.domainInvalid;
        valid = false;
      }
    }

    return valid;
  }

  onSubmit(): void {
    if (!this.validate() || this.loading) {
      return;
    }

    const payload: CreateSchoolDto | UpdateSchoolDto = {
      name: this.formData.name.trim(),
      type: this.formData.type,
      city: this.formData.city.trim(),
      address: this.formData.address.trim() || null,
      phone: this.formData.phone.trim() || null,
      description: this.formData.description.trim() || null,
      googleWorkspaceDomain: this.formData.googleWorkspaceDomain.trim() || null,
      mainLanguage: this.formData.mainLanguage || 'fr',
    };

    this.formSubmit.emit(payload);
  }

  handleApiError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        this.errors.name = this.i18n.schools.form.errors.conflictName;
      } else if (error.status === 403) {
        this.serverError = this.i18n.schools.form.errors.forbidden;
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

