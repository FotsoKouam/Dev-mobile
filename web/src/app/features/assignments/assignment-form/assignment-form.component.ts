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
  Assignment,
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from '../../../core/api/models/assignment.model';
import { School, Program } from '../../../core/api/models/school.model';
import { User, UserRole } from '../../../core/api/models/user.model';
import { AssignmentsApiService } from '../../../core/api/assignments-api.service';
import { I18N_FR } from '../../../shared/i18n/fr';

export type RoleCode = UserRole;

@Component({
  selector: 'app-assignment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="isEdit ? i18n.assignmentsPage.form.editTitle : i18n.assignmentsPage.form.createTitle"
      (closeModal)="close()"
    >
      <form class="assignment-form" (ngSubmit)="onSubmit()">
        @if (serverError) {
          <div class="form-banner-error" role="alert">
            {{ serverError }}
          </div>
        }

        <!-- 1. Utilisateur * -->
        <app-form-field
          [label]="i18n.assignmentsPage.form.userLabel"
          fieldId="assign-user"
          [error]="errors.user"
        >
          @if (isEdit) {
            <input
              id="assign-user"
              type="text"
              class="input-control disabled-input"
              [value]="selectedUserName"
              disabled
              readonly
            />
          } @else {
            <div class="user-picker-container">
              <input
                id="assign-user"
                type="text"
                class="input-control"
                [placeholder]="i18n.assignmentsPage.form.userSearchPlaceholder"
                [(ngModel)]="userSearchQuery"
                [ngModelOptions]="{ standalone: true }"
                (input)="onSearchUsers()"
                autocomplete="off"
              />
              @if (isSearchingUsers) {
                <div class="user-dropdown-loading">Recherche en cours…</div>
              } @else if (foundUsers.length > 0 && showUserDropdown) {
                <ul class="user-dropdown-list">
                  @for (u of foundUsers; track u.id) {
                    <li (click)="selectUser(u)" class="user-dropdown-item">
                      <span class="user-item-name">{{ u.firstName }} {{ u.lastName }}</span>
                      <span class="user-item-email">{{ u.email }}</span>
                    </li>
                  }
                </ul>
              }
              @if (selectedUser) {
                <div class="selected-user-pill">
                  <span>{{ selectedUser.firstName }} {{ selectedUser.lastName }} ({{ selectedUser.email }})</span>
                  <button type="button" class="pill-remove-btn" (click)="clearSelectedUser()">✕</button>
                </div>
              }
            </div>
          }
        </app-form-field>

        <!-- 2. Rôle * -->
        <app-form-field
          [label]="i18n.assignmentsPage.form.roleLabel"
          fieldId="assign-role"
          [error]="errors.role"
        >
          @if (isEdit) {
            <input
              id="assign-role"
              type="text"
              class="input-control disabled-input"
              [value]="selectedRoleDisplayName"
              disabled
              readonly
            />
          } @else {
            <select
              id="assign-role"
              class="select-control"
              [(ngModel)]="selectedRoleCode"
              [ngModelOptions]="{ standalone: true }"
              (change)="onRoleChange()"
            >
              <option value="" disabled>{{ i18n.assignmentsPage.form.rolePlaceholder }}</option>
              @for (r of roleOptions; track r.code) {
                <option [value]="r.code">{{ r.label }}</option>
              }
            </select>
          }
        </app-form-field>

        <!-- 3. École (selon rôle) -->
        @if (selectedRoleCode !== 'platform_admin') {
          <app-form-field
            [label]="i18n.assignmentsPage.form.schoolLabel"
            fieldId="assign-school"
            [error]="errors.school"
          >
            <select
              id="assign-school"
              class="select-control"
              [(ngModel)]="selectedSchoolId"
              [ngModelOptions]="{ standalone: true }"
              (change)="onSchoolChange()"
            >
              <option value="">{{ i18n.assignmentsPage.form.schoolPlaceholder }}</option>
              @for (s of schools; track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select>
          </app-form-field>
        }

        <!-- 4. Filière (selon rôle) -->
        @if (selectedRoleCode === 'staff' || selectedRoleCode === 'student') {
          <app-form-field
            [label]="i18n.assignmentsPage.form.programLabel + ' *'"
            fieldId="assign-program"
            [error]="errors.program"
          >
            <select
              id="assign-program"
              class="select-control"
              [(ngModel)]="selectedProgramId"
              [ngModelOptions]="{ standalone: true }"
              [disabled]="!selectedSchoolId || loadingPrograms"
            >
              <option value="">{{ i18n.assignmentsPage.form.programPlaceholder }}</option>
              @for (p of programs; track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </app-form-field>
        } @else if (selectedRoleCode === 'school_admin') {
          <div class="school-admin-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>{{ i18n.assignmentsPage.form.allProgramsNotice }}</span>
          </div>
        }

        <!-- Footer Actions -->
        <div footer class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="close()">
            {{ i18n.common.cancel }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ isEdit ? i18n.assignmentsPage.form.submitEdit : i18n.assignmentsPage.form.submitCreate }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [`
    .assignment-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-banner-error {
      background-color: #FDEDEC;
      border: 1px solid #F5C6CB;
      color: #E85D4E;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
    }
    .input-control, .select-control {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 8px;
      background: #FFFFFF;
      font-size: 14px;
      color: var(--color-text-primary, #111827);
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease;
    }
    .input-control:focus, .select-control:focus {
      border-color: var(--color-primary, #1B2A4A);
    }
    .disabled-input {
      background: #F3F4F6;
      color: #6B7280;
      cursor: not-allowed;
    }
    .user-picker-container {
      position: relative;
    }
    .user-dropdown-loading {
      font-size: 12px;
      color: #6B7280;
      padding: 6px 0;
    }
    .user-dropdown-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      list-style: none;
      margin: 4px 0 0 0;
      padding: 0;
      max-height: 180px;
      overflow-y: auto;
      z-index: 50;
    }
    .user-dropdown-item {
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid #F3F4F6;
    }
    .user-dropdown-item:hover {
      background: #F8FAFD;
    }
    .user-item-name {
      font-size: 13px;
      font-weight: 500;
      color: #111827;
    }
    .user-item-email {
      font-size: 12px;
      color: #6B7280;
    }
    .selected-user-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      background: #EBF3FC;
      color: #1E40AF;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }
    .pill-remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #1E40AF;
      font-size: 12px;
      padding: 0;
    }
    .school-admin-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: #F8FAFD;
      border-radius: 8px;
      font-size: 13px;
      color: #4B5563;
    }
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .btn {
      height: 40px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-secondary {
      background: #FFFFFF;
      border-color: #D9DFEA;
      color: #374151;
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
export class AssignmentFormComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() assignmentToEdit?: Assignment | null;
  @Input() set assignment(val: Assignment | null | undefined) {
    this.assignmentToEdit = val;
  }
  @Input() loading = false;
  @Input() schools: School[] = [];

  @Output() formSubmit = new EventEmitter<CreateAssignmentDto | UpdateAssignmentDto>();
  @Output() formCancel = new EventEmitter<void>();

  private readonly api = inject(AssignmentsApiService);
  readonly i18n = I18N_FR;

  readonly roleOptions: { code: RoleCode; label: string }[] = [
    { code: 'platform_admin', label: I18N_FR.roles.platform_admin },
    { code: 'school_admin', label: I18N_FR.roles.school_admin },
    { code: 'staff', label: I18N_FR.roles.staff },
    { code: 'student', label: I18N_FR.roles.student },
    { code: 'guest', label: I18N_FR.roles.guest },
  ];

  selectedUser: User | null = null;
  userSearchQuery = '';
  foundUsers: User[] = [];
  isSearchingUsers = false;
  showUserDropdown = false;

  selectedRoleCode: RoleCode | '' = '';
  selectedSchoolId = '';
  selectedProgramId = '';

  programs: Program[] = [];
  loadingPrograms = false;

  errors: {
    user?: string;
    role?: string;
    school?: string;
    program?: string;
  } = {};

  serverError: string | null = null;

  get isEdit(): boolean {
    return !!this.assignmentToEdit;
  }

  get selectedUserName(): string {
    if (!this.assignmentToEdit) return '';
    return `${this.assignmentToEdit.user.firstName} ${this.assignmentToEdit.user.lastName} (${this.assignmentToEdit.user.email})`;
  }

  get selectedRoleDisplayName(): string {
    if (!this.assignmentToEdit?.role) return '';
    return (
      (this.i18n.roles as Record<string, string>)[this.assignmentToEdit.role.code] ||
      this.assignmentToEdit.role.name
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assignmentToEdit'] || changes['isOpen']) {
      if (this.isOpen) {
        this.reset();
      }
    }
  }

  reset(): void {
    this.errors = {};
    this.serverError = null;
    this.userSearchQuery = '';
    this.foundUsers = [];
    this.showUserDropdown = false;

    if (this.assignmentToEdit) {
      this.selectedUser = {
        id: this.assignmentToEdit.user.id,
        firstName: this.assignmentToEdit.user.firstName,
        lastName: this.assignmentToEdit.user.lastName,
        email: this.assignmentToEdit.user.email,
        phone: null,
        lastLoginAt: null,
        assignments: [],
        authMethod: 'google',
        status: 'active',
        createdAt: '',
        updatedAt: '',
      };
      this.selectedRoleCode = this.assignmentToEdit.role.code;
      this.selectedSchoolId = this.assignmentToEdit.school?.id || '';
      this.selectedProgramId = this.assignmentToEdit.program?.id || '';
      if (this.selectedSchoolId) {
        this.loadPrograms(this.selectedSchoolId);
      }
    } else {
      this.selectedUser = null;
      this.selectedRoleCode = '';
      this.selectedSchoolId = '';
      this.selectedProgramId = '';
      this.programs = [];
    }
  }

  onSearchUsers(): void {
    const term = this.userSearchQuery.trim();
    if (!term) {
      this.foundUsers = [];
      this.showUserDropdown = false;
      return;
    }

    this.isSearchingUsers = true;
    this.api.searchUsers(term, 10).subscribe({
      next: (res) => {
        this.foundUsers = res.data || [];
        this.showUserDropdown = true;
        this.isSearchingUsers = false;
      },
      error: () => {
        this.foundUsers = [];
        this.isSearchingUsers = false;
      },
    });
  }

  selectUser(u: User): void {
    this.selectedUser = u;
    this.userSearchQuery = '';
    this.foundUsers = [];
    this.showUserDropdown = false;
    delete this.errors.user;
  }

  clearSelectedUser(): void {
    this.selectedUser = null;
  }

  onRoleChange(): void {
    delete this.errors.role;
    delete this.errors.school;
    delete this.errors.program;

    if (this.selectedRoleCode === 'platform_admin') {
      this.selectedSchoolId = '';
      this.selectedProgramId = '';
      this.programs = [];
    } else if (this.selectedRoleCode === 'school_admin' || this.selectedRoleCode === 'guest') {
      this.selectedProgramId = '';
    }
  }

  onSchoolChange(): void {
    delete this.errors.school;
    this.selectedProgramId = '';
    this.programs = [];

    if (this.selectedSchoolId) {
      this.loadPrograms(this.selectedSchoolId);
    }
  }

  loadPrograms(schoolId: string): void {
    this.loadingPrograms = true;
    this.api.getSchoolPrograms(schoolId).subscribe({
      next: (progs) => {
        this.programs = progs || [];
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

    if (!this.selectedUser && !this.isEdit) {
      this.errors.user = this.i18n.assignmentsPage.form.errors.userRequired;
    }

    if (!this.selectedRoleCode && !this.isEdit) {
      this.errors.role = this.i18n.assignmentsPage.form.errors.roleRequired;
    }

    const role = this.selectedRoleCode;

    if (role === 'school_admin' || role === 'staff' || role === 'student') {
      if (!this.selectedSchoolId) {
        this.errors.school = this.i18n.assignmentsPage.form.errors.schoolRequired;
      }
    }

    if (role === 'staff' || role === 'student') {
      if (!this.selectedProgramId) {
        this.errors.program = this.i18n.assignmentsPage.form.errors.programRequired;
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  onSubmit(): void {
    if (!this.validate() || this.loading) {
      return;
    }

    if (this.isEdit) {
      const payload: UpdateAssignmentDto = {
        schoolId: this.selectedSchoolId || undefined,
        programId: this.selectedProgramId || undefined,
      };
      this.formSubmit.emit(payload);
    } else {
      const payload: CreateAssignmentDto = {
        userId: this.selectedUser!.id,
        roleCode: this.selectedRoleCode as RoleCode,
        schoolId: this.selectedSchoolId || undefined,
        programId: this.selectedProgramId || undefined,
      };
      this.formSubmit.emit(payload);
    }
  }

  handleApiError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        this.serverError = this.i18n.assignmentsPage.form.errors.conflict;
      } else if (error.status === 403) {
        this.serverError = this.i18n.assignmentsPage.form.errors.forbidden;
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
