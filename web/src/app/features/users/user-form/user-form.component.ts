import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  UserRole,
  AuthMethod,
} from '../../../core/api/models/user.model';
import { School, Program } from '../../../core/api/models/school.model';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { I18N_FR } from '../../../shared/i18n/fr';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="isEdit ? i18n.users.form.editTitle : i18n.users.form.inviteTitle"
      (closeModal)="close()"
    >
      <form class="user-form" (ngSubmit)="onSubmit()">
        @if (serverError) {
          <div class="form-banner-error" role="alert">
            {{ serverError }}
          </div>
        }

        <!-- 1. Prénom * -->
        <app-form-field
          [label]="i18n.users.form.firstNameLabel"
          fieldId="user-firstname"
          [error]="errors.firstName"
        >
          <input
            id="user-firstname"
            type="text"
            class="input-control"
            [(ngModel)]="formData.firstName"
            name="firstName"
            required
            minlength="2"
            maxlength="80"
            [class.input-error]="!!errors.firstName"
          />
        </app-form-field>

        <!-- 2. Nom * -->
        <app-form-field
          [label]="i18n.users.form.lastNameLabel"
          fieldId="user-lastname"
          [error]="errors.lastName"
        >
          <input
            id="user-lastname"
            type="text"
            class="input-control"
            [(ngModel)]="formData.lastName"
            name="lastName"
            required
            minlength="2"
            maxlength="80"
            [class.input-error]="!!errors.lastName"
          />
        </app-form-field>

        <!-- 3. Email * -->
        <app-form-field
          [label]="i18n.users.form.emailLabel"
          fieldId="user-email"
          [error]="errors.email"
        >
          <input
            id="user-email"
            type="email"
            class="input-control"
            [(ngModel)]="formData.email"
            name="email"
            required
            [disabled]="isEdit"
            [class.input-error]="!!errors.email"
          />
        </app-form-field>

        <!-- 4. Téléphone -->
        <app-form-field
          [label]="i18n.users.form.phoneLabel"
          fieldId="user-phone"
        >
          <input
            id="user-phone"
            type="tel"
            class="input-control"
            [(ngModel)]="formData.phone"
            name="phone"
            placeholder="+237 6 12 34 56 78"
          />
        </app-form-field>

        <!-- Affectation initiale uniquement en création -->
        @if (!isEdit) {
          <!-- 5. École * -->
          <app-form-field
            [label]="i18n.users.form.schoolLabel"
            fieldId="user-school"
            [error]="errors.schoolId"
          >
            <select
              id="user-school"
              class="input-control select-control"
              [(ngModel)]="formData.schoolId"
              name="schoolId"
              (ngModelChange)="onSchoolChange($event)"
              [class.input-error]="!!errors.schoolId"
            >
              <option value="">{{ i18n.users.form.selectSchoolPlaceholder }}</option>
              @for (school of schools; track school.id) {
                <option [value]="school.id">{{ school.name }}</option>
              }
            </select>
          </app-form-field>

          <!-- 6. Filière (conditionnelle ou obligatoire selon rôle) -->
          <app-form-field
            [label]="i18n.users.form.programLabel"
            fieldId="user-program"
            [error]="errors.programId"
          >
            <select
              id="user-program"
              class="input-control select-control"
              [(ngModel)]="formData.programId"
              name="programId"
              [disabled]="!formData.schoolId || loadingPrograms"
              [class.input-error]="!!errors.programId"
            >
              <option value="">{{ i18n.users.form.selectProgramPlaceholder }}</option>
              @for (prog of programs; track prog.id) {
                <option [value]="prog.id">{{ prog.name }}</option>
              }
            </select>
          </app-form-field>

          <!-- 7. Rôle * -->
          <app-form-field
            [label]="i18n.users.form.roleLabel"
            fieldId="user-role"
            [error]="errors.roleCode"
          >
            <select
              id="user-role"
              class="input-control select-control"
              [(ngModel)]="formData.roleCode"
              name="roleCode"
              [class.input-error]="!!errors.roleCode"
            >
              <option value="">{{ i18n.users.form.selectRolePlaceholder }}</option>
              <option value="school_admin">{{ i18n.roles.school_admin }}</option>
              <option value="staff">{{ i18n.roles.staff }}</option>
              <option value="student">{{ i18n.roles.student }}</option>
              <option value="guest">{{ i18n.roles.guest }}</option>
              <option value="platform_admin">{{ i18n.roles.platform_admin }}</option>
            </select>
          </app-form-field>
        }
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
          {{ isEdit ? i18n.users.form.submitEdit : i18n.users.form.submitInvite }}
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .user-form {
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
    .input-control:disabled {
      background: #F0F4FA;
      color: #7A8499;
      cursor: not-allowed;
    }
    .input-error {
      border-color: var(--color-error, #E85D4E);
    }
    .select-control {
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
export class UserFormComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() userToEdit?: User | null;
  @Input() loading = false;
  @Input() schools: School[] = [];

  @Output() formSubmit = new EventEmitter<CreateUserDto | UpdateUserDto>();
  @Output() formCancel = new EventEmitter<void>();

  private readonly schoolsApi = inject(SchoolsApiService);
  readonly i18n = I18N_FR;

  programs: Program[] = [];
  loadingPrograms = false;

  formData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    schoolId: '',
    programId: '',
    roleCode: '' as UserRole | '',
  };

  errors: {
    firstName?: string;
    lastName?: string;
    email?: string;
    schoolId?: string;
    programId?: string;
    roleCode?: string;
  } = {};

  serverError: string | null = null;

  get isEdit(): boolean {
    return !!this.userToEdit;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userToEdit'] || changes['isOpen']) {
      if (this.isOpen) {
        this.reset();
      }
    }
  }

  reset(): void {
    this.errors = {};
    this.serverError = null;

    if (this.userToEdit) {
      this.formData = {
        firstName: this.userToEdit.firstName || '',
        lastName: this.userToEdit.lastName || '',
        email: this.userToEdit.email || '',
        phone: this.userToEdit.phone || '',
        schoolId: '',
        programId: '',
        roleCode: '',
      };
      this.programs = [];
    } else {
      this.formData = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        schoolId: '',
        programId: '',
        roleCode: '',
      };
      this.programs = [];
    }
  }

  onSchoolChange(schoolId: string): void {
    this.formData.programId = '';
    this.programs = [];
    if (!schoolId) return;

    this.loadingPrograms = true;
    this.schoolsApi.getPrograms(schoolId, { limit: 100 }).subscribe({
      next: (res) => {
        this.programs = res.data || [];
        this.loadingPrograms = false;
      },
      error: () => {
        this.programs = [];
        this.loadingPrograms = false;
      },
    });
  }

  validate(): boolean {
    this.errors = {};
    this.serverError = null;
    let valid = true;

    const firstName = this.formData.firstName.trim();
    if (!firstName || firstName.length < 2 || firstName.length > 80) {
      this.errors.firstName = this.i18n.users.form.errors.firstNameRequired;
      valid = false;
    }

    const lastName = this.formData.lastName.trim();
    if (!lastName || lastName.length < 2 || lastName.length > 80) {
      this.errors.lastName = this.i18n.users.form.errors.lastNameRequired;
      valid = false;
    }

    const email = this.formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      this.errors.email = this.i18n.users.form.errors.emailRequired;
      valid = false;
    } else if (!emailRegex.test(email)) {
      this.errors.email = this.i18n.users.form.errors.emailInvalid;
      valid = false;
    }

    if (!this.isEdit) {
      if (!this.formData.roleCode) {
        this.errors.roleCode = this.i18n.users.form.errors.roleRequired;
        valid = false;
      }

      // Si le rôle n'est pas platform_admin, l'école est requise
      if (this.formData.roleCode && this.formData.roleCode !== 'platform_admin' && !this.formData.schoolId) {
        this.errors.schoolId = this.i18n.users.form.errors.schoolRequired;
        valid = false;
      }

      // Pour staff et student, la filière est recommandée/requise si l'école a des filières
      if (
        (this.formData.roleCode === 'staff' || this.formData.roleCode === 'student') &&
        this.formData.schoolId &&
        this.programs.length > 0 &&
        !this.formData.programId
      ) {
        this.errors.programId = this.i18n.users.form.errors.programRequired;
        valid = false;
      }
    }

    return valid;
  }

  onSubmit(): void {
    if (!this.validate() || this.loading) {
      return;
    }

    if (this.isEdit) {
      const payload: UpdateUserDto = {
        firstName: this.formData.firstName.trim(),
        lastName: this.formData.lastName.trim(),
        phone: this.formData.phone.trim() || undefined,
      };
      this.formSubmit.emit(payload);
    } else {
      const payload: CreateUserDto = {
        email: this.formData.email.trim().toLowerCase(),
        firstName: this.formData.firstName.trim(),
        lastName: this.formData.lastName.trim(),
        phone: this.formData.phone.trim() || undefined,
        authMethod: 'google',
        assignment: this.formData.roleCode
          ? {
              roleCode: this.formData.roleCode,
              schoolId: this.formData.schoolId || undefined,
              programId: this.formData.programId || undefined,
            }
          : undefined,
      };
      this.formSubmit.emit(payload);
    }
  }

  handleApiError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        this.errors.email = this.i18n.users.form.errors.conflictEmail;
      } else if (error.status === 403) {
        this.serverError = this.i18n.users.form.errors.forbidden;
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

