import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';
import { Role, CreateRoleDto, UpdateRoleDto } from '../../../core/api/models/role.model';
import { I18N_FR } from '../../../shared/i18n/fr';

export interface PermissionCheckbox {
  code: string;
  label: string;
  checked: boolean;
}

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="isEdit ? i18n.rolesPage.form.editTitle : i18n.rolesPage.form.createTitle"
      (closeModal)="close()"
    >
      <form class="role-form" (ngSubmit)="onSubmit()">
        @if (serverError) {
          <div class="form-banner-error" role="alert">
            {{ serverError }}
          </div>
        }

        <!-- 1. Nom du rôle * -->
        <app-form-field
          [label]="i18n.rolesPage.form.nameLabel"
          fieldId="role-name"
          [error]="errors.name"
        >
          <input
            id="role-name"
            type="text"
            class="input-control"
            [(ngModel)]="formData.name"
            name="name"
            required
            minlength="2"
            maxlength="80"
            [class.input-error]="!!errors.name"
          />
        </app-form-field>

        <!-- 2. Code * (création seulement) -->
        <app-form-field
          [label]="i18n.rolesPage.form.codeLabel"
          fieldId="role-code"
          [helpText]="i18n.rolesPage.form.codeHelp"
          [error]="errors.code"
        >
          <input
            id="role-code"
            type="text"
            class="input-control"
            [(ngModel)]="formData.code"
            name="code"
            required
            [disabled]="isEdit"
            placeholder="ex: pedagogic_lead"
            [class.input-error]="!!errors.code"
          />
        </app-form-field>

        <!-- 3. Description (3 lignes) -->
        <app-form-field
          [label]="i18n.rolesPage.form.descLabel"
          fieldId="role-desc"
        >
          <textarea
            id="role-desc"
            class="input-control textarea-control"
            rows="3"
            [(ngModel)]="formData.description"
            name="description"
          ></textarea>
        </app-form-field>

        <!-- 4. Périmètre * -->
        <app-form-field
          [label]="i18n.rolesPage.form.scopeLabel"
          fieldId="role-scope"
        >
          <select
            id="role-scope"
            class="input-control select-control"
            [(ngModel)]="formData.scope"
            name="scope"
          >
            <option value="Son école (toutes ses filières)">{{ i18n.rolesPage.scopes.school }}</option>
            <option value="Sa filière">{{ i18n.rolesPage.scopes.program }}</option>
            <option value="Toutes les écoles">{{ i18n.rolesPage.scopes.allSchools }}</option>
            <option value="Espaces partagés explicitement (application mobile)">{{ i18n.rolesPage.scopes.sharedSpaces }}</option>
          </select>
        </app-form-field>

        <!-- 5. Permissions (Cases à cocher) -->
        <div class="permissions-form-group">
          <label class="form-group-label">{{ i18n.rolesPage.form.permissionsLabel }}</label>
          <div class="permissions-checklist">
            @for (perm of permissionsList; track perm.code) {
              <label class="perm-checkbox-item">
                <input
                  type="checkbox"
                  class="custom-checkbox"
                  [checked]="perm.checked"
                  (change)="onTogglePermission(perm.code, $event)"
                />
                <span class="perm-checkbox-label">{{ perm.label }}</span>
              </label>
            }
          </div>
        </div>
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
          {{ isEdit ? i18n.rolesPage.form.submitEdit : i18n.rolesPage.form.submitCreate }}
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .role-form {
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
    .textarea-control {
      height: auto;
      padding: 10px 14px;
      resize: vertical;
    }
    .select-control {
      cursor: pointer;
    }
    .permissions-form-group {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .form-group-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
    }
    .permissions-checklist {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      max-height: 220px;
      overflow-y: auto;
      padding: 10px;
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 8px;
      background: #F8FAFD;
    }
    .perm-checkbox-item {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .custom-checkbox {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      accent-color: var(--color-primary, #1B2A4A);
      cursor: pointer;
    }
    .perm-checkbox-label {
      font-size: 13px;
      color: var(--color-text-dark, #1B2A4A);
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
export class RoleFormComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() roleToEdit?: Role | null;
  @Input() set role(val: Role | null | undefined) {
    this.roleToEdit = val;
  }
  @Input() loading = false;

  @Output() formSubmit = new EventEmitter<CreateRoleDto | UpdateRoleDto>();
  @Output() formCancel = new EventEmitter<void>();

  readonly i18n = I18N_FR;

  readonly allPermissionDefinitions: { code: string; label: string }[] = [
    { code: 'manage_schools', label: I18N_FR.permissions.manage_schools },
    { code: 'manage_programs', label: I18N_FR.permissions.manage_programs },
    { code: 'manage_users', label: I18N_FR.permissions.manage_users },
    { code: 'manage_roles', label: I18N_FR.permissions.manage_roles },
    { code: 'manage_assignments', label: I18N_FR.permissions.manage_assignments },
    { code: 'create_institutional_space', label: I18N_FR.permissions.create_institutional_space },
    { code: 'add_document', label: I18N_FR.permissions.add_document },
    { code: 'replace_or_delete_document', label: I18N_FR.permissions.replace_or_delete_document },
    { code: 'view_audit_log', label: I18N_FR.permissions.view_audit_log },
    { code: 'access_all_schools', label: I18N_FR.permissions.access_all_schools },
  ];

  permissionsList: PermissionCheckbox[] = [];

  formData = {
    name: '',
    code: '',
    description: '',
    scope: 'Sa filière',
  };

  errors: {
    name?: string;
    code?: string;
  } = {};

  serverError: string | null = null;

  get isEdit(): boolean {
    return !!this.roleToEdit;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roleToEdit'] || changes['isOpen']) {
      if (this.isOpen) {
        this.reset();
      }
    }
  }

  reset(): void {
    this.errors = {};
    this.serverError = null;

    if (this.roleToEdit) {
      this.formData = {
        name: this.roleToEdit.name || '',
        code: this.roleToEdit.code || '',
        description: this.roleToEdit.description || '',
        scope: this.roleToEdit.scope || 'Sa filière',
      };
      const activePerms = new Set(this.roleToEdit.permissions || []);
      this.permissionsList = this.allPermissionDefinitions.map((p) => ({
        ...p,
        checked: activePerms.has(p.code),
      }));
    } else {
      this.formData = {
        name: '',
        code: '',
        description: '',
        scope: 'Sa filière',
      };
      this.permissionsList = this.allPermissionDefinitions.map((p) => ({
        ...p,
        checked: false,
      }));
    }
  }

  onTogglePermission(code: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const target = this.permissionsList.find((p) => p.code === code);
    if (target) {
      target.checked = checked;
    }
  }

  validate(): boolean {
    this.errors = {};
    this.serverError = null;
    let valid = true;

    const name = this.formData.name.trim();
    if (!name || name.length < 2 || name.length > 80) {
      this.errors.name = this.i18n.rolesPage.form.errors.nameRequired;
      valid = false;
    }

    if (!this.isEdit) {
      const code = this.formData.code.trim();
      const snakeCaseRegex = /^[a-z][a-z0-9_]{2,49}$/;
      if (!code || code.length < 3 || code.length > 50) {
        this.errors.code = this.i18n.rolesPage.form.errors.codeRequired;
        valid = false;
      } else if (!snakeCaseRegex.test(code)) {
        this.errors.code = this.i18n.rolesPage.form.errors.codeInvalid;
        valid = false;
      }
    }

    return valid;
  }

  onSubmit(): void {
    if (!this.validate() || this.loading) {
      return;
    }

    const selectedPermissions = this.permissionsList
      .filter((p) => p.checked)
      .map((p) => p.code);

    if (this.isEdit) {
      const payload: UpdateRoleDto = {
        name: this.formData.name.trim(),
        description: this.formData.description.trim() || undefined,
        permissions: selectedPermissions,
        scope: this.formData.scope,
      };
      this.formSubmit.emit(payload);
    } else {
      const payload: CreateRoleDto = {
        name: this.formData.name.trim(),
        code: this.formData.code.trim(),
        description: this.formData.description.trim() || undefined,
        permissions: selectedPermissions,
        scope: this.formData.scope,
      };
      this.formSubmit.emit(payload);
    }
  }

  handleApiError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        this.errors.code = this.i18n.rolesPage.form.errors.conflictCode;
      } else if (error.status === 403) {
        this.serverError = this.i18n.rolesPage.form.errors.forbidden;
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
