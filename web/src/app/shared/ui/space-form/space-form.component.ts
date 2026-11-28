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
import { SpacesApiService } from '../../../core/api/spaces-api.service';
import { Space, SpaceScope, SpaceStatus } from '../../../core/api/models/space.model';
import { School, Program } from '../../../core/api/models/school.model';
import { ModalComponent } from '../modal/modal.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { ToastService } from '../toast/toast.service';
import { I18N_FR } from '../../i18n/fr';

@Component({
  selector: 'app-space-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="isEditing ? i18n.spaceForm.editTitle : i18n.spaceForm.createTitle"
      (closeModal)="onCancel()"
    >
      <form class="space-form-content" (ngSubmit)="onSubmit()" novalidate>
        <!-- Erreur globale 400 ou réseau -->
        @if (serverError()) {
          <div class="form-banner-error">
            {{ serverError() }}
          </div>
        }

        <!-- 1. École * (désactivée en mode édition ou si fixée) -->
        <app-form-field
          [label]="i18n.spaceForm.schoolLabel"
          [error]="schoolError()"
        >
          <select
            class="form-select"
            [ngModel]="selectedSchoolId()"
            (ngModelChange)="onSchoolChange($event)"
            name="schoolId"
            [disabled]="isEditing || isSchoolFixed || loadingSchools()"
          >
            <option value="" disabled>{{ i18n.spaceForm.schoolPlaceholder }}</option>
            @for (school of schools(); track school.id) {
              <option [value]="school.id">{{ school.name }}</option>
            }
          </select>
        </app-form-field>

        <!-- 2. Nom de l'espace * -->
        <app-form-field
          [label]="i18n.spaceForm.nameLabel"
          [error]="nameError()"
        >
          <input
            type="text"
            class="form-input"
            [placeholder]="i18n.spaceForm.namePlaceholder"
            [ngModel]="name()"
            (ngModelChange)="name.set($event); nameError.set('')"
            name="name"
            maxlength="150"
            required
          />
        </app-form-field>

        <!-- 3. Description (facultative) -->
        <app-form-field [label]="i18n.spaceForm.descLabel">
          <textarea
            class="form-textarea"
            rows="3"
            [placeholder]="i18n.spaceForm.descPlaceholder"
            [ngModel]="description()"
            (ngModelChange)="description.set($event)"
            name="description"
          ></textarea>
        </app-form-field>

        <!-- 4. Portée * (en création uniquement) -->
        @if (!isEditing) {
          <app-form-field
            [label]="i18n.spaceForm.scopeLabel"
            [error]="scopeError()"
          >
            <div class="scope-options">
              <label class="scope-radio-card" [class.selected]="selectedScope() === 'school'">
                <input
                  type="radio"
                  name="scope"
                  value="school"
                  [ngModel]="selectedScope()"
                  (ngModelChange)="onScopeChange($event)"
                />
                <div class="scope-card-content">
                  <span class="scope-title">{{ i18n.spaceForm.scopes.school }}</span>
                  <span class="scope-help">{{ i18n.spaceForm.scopes.schoolHelp }}</span>
                </div>
              </label>

              <label class="scope-radio-card" [class.selected]="selectedScope() === 'program'">
                <input
                  type="radio"
                  name="scope"
                  value="program"
                  [ngModel]="selectedScope()"
                  (ngModelChange)="onScopeChange($event)"
                />
                <div class="scope-card-content">
                  <span class="scope-title">{{ i18n.spaceForm.scopes.program }}</span>
                  <span class="scope-help">{{ i18n.spaceForm.scopes.programHelp }}</span>
                </div>
              </label>

              <label class="scope-radio-card" [class.selected]="selectedScope() === 'role'">
                <input
                  type="radio"
                  name="scope"
                  value="role"
                  [ngModel]="selectedScope()"
                  (ngModelChange)="onScopeChange($event)"
                />
                <div class="scope-card-content">
                  <span class="scope-title">{{ i18n.spaceForm.scopes.role }}</span>
                  <span class="scope-help">{{ i18n.spaceForm.scopes.roleHelp }}</span>
                </div>
              </label>

              <label class="scope-radio-card" [class.selected]="selectedScope() === 'individual'">
                <input
                  type="radio"
                  name="scope"
                  value="individual"
                  [ngModel]="selectedScope()"
                  (ngModelChange)="onScopeChange($event)"
                />
                <div class="scope-card-content">
                  <span class="scope-title">{{ i18n.spaceForm.scopes.individual }}</span>
                  <span class="scope-help">{{ i18n.spaceForm.scopes.individualHelp }}</span>
                </div>
              </label>
            </div>
          </app-form-field>

          <!-- Cible selon portée -->
          <!-- Si portée = Filière -->
          @if (selectedScope() === 'program') {
            <app-form-field
              [label]="i18n.spaceForm.programLabel"
              [error]="programError()"
            >
              <select
                class="form-select"
                [ngModel]="selectedProgramId()"
                (ngModelChange)="onProgramChange($event)"
                name="programId"
                [disabled]="!selectedSchoolId() || loadingPrograms()"
              >
                <option value="" disabled>{{ i18n.spaceForm.programPlaceholder }}</option>
                @for (program of programs(); track program.id) {
                  <option [value]="program.id">{{ program.name }}</option>
                }
              </select>
            </app-form-field>
          }

          <!-- Si portée = Rôle -->
          @if (selectedScope() === 'role') {
            <app-form-field
              [label]="i18n.spaceForm.roleLabel"
              [error]="roleError()"
            >
              <select
                class="form-select"
                [ngModel]="selectedRoleCode()"
                (ngModelChange)="onRoleChange($event)"
                name="roleCode"
              >
                <option value="" disabled>{{ i18n.spaceForm.rolePlaceholder }}</option>
                <option value="staff">{{ i18n.spaceForm.roles.staff }}</option>
                <option value="admin_staff">{{ i18n.spaceForm.roles.admin_staff }}</option>
              </select>
            </app-form-field>
          }
        }

        <!-- Statut (en mode édition uniquement) -->
        @if (isEditing) {
          <app-form-field [label]="i18n.spaceForm.statusLabel">
            <select
              class="form-select"
              [ngModel]="status()"
              (ngModelChange)="status.set($event)"
              name="status"
            >
              <option value="active">{{ i18n.status.active }}</option>
              <option value="inactive">{{ i18n.status.inactive }}</option>
            </select>
          </app-form-field>
        }
      </form>

      <div footer class="space-form-actions">
        <button
          type="button"
          class="btn btn-secondary"
          (click)="onCancel()"
          [disabled]="loadingSubmit()"
        >
          {{ i18n.spaceForm.cancelBtn }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="onSubmit()"
          [disabled]="loadingSubmit()"
        >
          {{ isEditing ? i18n.spaceForm.submitEdit : i18n.spaceForm.submitCreate }}
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .space-form-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-banner-error {
      background-color: #fef2f2;
      border: 1px solid #fee2e2;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
    }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      border: 1px solid #d8dee8;
      border-radius: 6px;
      font-size: 13.5px;
      color: #1b2a4a;
      background-color: #ffffff;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: #2f6fed;
    }
    .form-input:disabled, .form-select:disabled {
      background-color: #f8fafc;
      color: #94a3b8;
      cursor: not-allowed;
    }
    .form-textarea {
      resize: vertical;
    }
    .scope-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .scope-radio-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid #d8dee8;
      border-radius: 6px;
      cursor: pointer;
      background-color: #ffffff;
      transition: border-color 0.15s, background-color 0.15s;
    }
    .scope-radio-card:hover {
      border-color: #cbd5e1;
      background-color: #f8fafc;
    }
    .scope-radio-card.selected {
      border-color: #2f6fed;
      background-color: #eff6ff;
    }
    .scope-radio-card input[type="radio"] {
      margin-top: 2px;
      cursor: pointer;
    }
    .scope-card-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .scope-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #1b2a4a;
    }
    .scope-help {
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.3;
    }
    .space-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background-color 0.15s;
    }
    .btn-secondary {
      background-color: #f1f5f9;
      color: #334155;
      border-color: #e2e8f0;
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
export class SpaceFormComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() spaceToEdit: Space | null = null;
  @Input() initialSchoolId?: string;
  @Input() initialProgramId?: string;

  @Output() formClosed = new EventEmitter<void>();
  @Output() spaceSaved = new EventEmitter<Space>();

  private readonly api = inject(SpacesApiService);
  private readonly toast = inject(ToastService);

  readonly i18n = I18N_FR;

  readonly schools = signal<School[]>([]);
  readonly programs = signal<Program[]>([]);

  readonly selectedSchoolId = signal<string>('');
  readonly name = signal<string>('');
  readonly description = signal<string>('');
  readonly selectedScope = signal<SpaceScope>('school');
  readonly selectedProgramId = signal<string>('');
  readonly selectedRoleCode = signal<string>('');
  readonly status = signal<SpaceStatus>('active');

  readonly loadingSchools = signal<boolean>(false);
  readonly loadingPrograms = signal<boolean>(false);
  readonly loadingSubmit = signal<boolean>(false);

  readonly schoolError = signal<string>('');
  readonly scopeError = signal<string>('');
  readonly programError = signal<string>('');
  readonly roleError = signal<string>('');
  readonly nameError = signal<string>('');
  readonly serverError = signal<string>('');

  get isEditing(): boolean {
    return !!this.spaceToEdit;
  }

  get isSchoolFixed(): boolean {
    return !!this.initialSchoolId;
  }

  ngOnInit(): void {
    this.loadSchools();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.serverError.set('');
    this.schoolError.set('');
    this.scopeError.set('');
    this.programError.set('');
    this.roleError.set('');
    this.nameError.set('');

    if (this.spaceToEdit) {
      this.selectedSchoolId.set(this.spaceToEdit.school?.id || '');
      this.name.set(this.spaceToEdit.name || '');
      this.description.set(this.spaceToEdit.description || '');
      this.selectedScope.set(this.spaceToEdit.scope || 'school');
      this.selectedProgramId.set(this.spaceToEdit.scopeProgramId || '');
      this.selectedRoleCode.set(this.spaceToEdit.scopeRoleCode || '');
      this.status.set(this.spaceToEdit.status || 'active');

      if (this.spaceToEdit.school?.id) {
        this.loadPrograms(this.spaceToEdit.school.id);
      }
    } else {
      this.name.set('');
      this.description.set('');
      this.selectedScope.set(this.initialProgramId ? 'program' : 'school');
      this.selectedProgramId.set(this.initialProgramId || '');
      this.selectedRoleCode.set('');
      this.status.set('active');

      const sId = this.initialSchoolId || '';
      this.selectedSchoolId.set(sId);

      if (sId) {
        this.loadPrograms(sId);
      } else {
        this.programs.set([]);
      }
    }
  }

  loadSchools(): void {
    this.loadingSchools.set(true);
    this.api.getSchools(100).subscribe({
      next: (page) => {
        this.schools.set(page.data || []);
        this.loadingSchools.set(false);
      },
      error: () => {
        this.schools.set([]);
        this.loadingSchools.set(false);
      },
    });
  }

  loadPrograms(schoolId: string): void {
    if (!schoolId) {
      this.programs.set([]);
      return;
    }
    this.loadingPrograms.set(true);
    this.api.getSchoolPrograms(schoolId).subscribe({
      next: (res) => {
        this.programs.set(res?.data || []);
        this.loadingPrograms.set(false);
      },
      error: () => {
        this.programs.set([]);
        this.loadingPrograms.set(false);
      },
    });
  }

  onSchoolChange(schoolId: string): void {
    this.selectedSchoolId.set(schoolId);
    this.selectedProgramId.set('');
    this.schoolError.set('');
    this.programError.set('');
    this.loadPrograms(schoolId);
  }

  onScopeChange(scope: SpaceScope): void {
    this.selectedScope.set(scope);
    // Changer de portée réinitialise la cible
    this.selectedProgramId.set('');
    this.selectedRoleCode.set('');
    this.scopeError.set('');
    this.programError.set('');
    this.roleError.set('');
  }

  onProgramChange(programId: string): void {
    this.selectedProgramId.set(programId);
    this.programError.set('');
  }

  onRoleChange(roleCode: string): void {
    this.selectedRoleCode.set(roleCode);
    this.roleError.set('');
  }

  validate(): boolean {
    let isValid = true;
    this.schoolError.set('');
    this.scopeError.set('');
    this.programError.set('');
    this.roleError.set('');
    this.nameError.set('');
    this.serverError.set('');

    if (!this.selectedSchoolId()) {
      this.schoolError.set(this.i18n.spaceForm.errors.schoolRequired);
      isValid = false;
    }

    const trimmedName = this.name().trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 150) {
      this.nameError.set(this.i18n.spaceForm.errors.nameRequired);
      isValid = false;
    }

    if (!this.isEditing) {
      const scope = this.selectedScope();
      if (!scope) {
        this.scopeError.set(this.i18n.spaceForm.errors.scopeRequired);
        isValid = false;
      } else if (scope === 'program') {
        if (!this.selectedProgramId()) {
          this.programError.set(this.i18n.spaceForm.errors.programRequired);
          isValid = false;
        }
      } else if (scope === 'role') {
        if (!this.selectedRoleCode()) {
          this.roleError.set(this.i18n.spaceForm.errors.roleRequired);
          isValid = false;
        }
      }
    }

    return isValid;
  }

  onSubmit(): void {
    if (!this.validate()) {
      return;
    }

    this.loadingSubmit.set(true);

    if (this.isEditing && this.spaceToEdit) {
      this.api
        .updateSpace(this.spaceToEdit.id, {
          name: this.name().trim(),
          description: this.description().trim() || undefined,
          status: this.status(),
        })
        .subscribe({
          next: (updated) => {
            this.loadingSubmit.set(false);
            this.toast.success(this.i18n.spaceForm.toastUpdated);
            this.spaceSaved.emit(updated);
            this.formClosed.emit();
          },
          error: (err) => {
            this.loadingSubmit.set(false);
            this.handleError(err);
          },
        });
    } else {
      this.api
        .createSpace(this.selectedSchoolId(), {
          name: this.name().trim(),
          description: this.description().trim() || undefined,
          scope: this.selectedScope(),
          programId: this.selectedScope() === 'program' ? this.selectedProgramId() : undefined,
          roleCode: this.selectedScope() === 'role' ? this.selectedRoleCode() : undefined,
        })
        .subscribe({
          next: (created) => {
            this.loadingSubmit.set(false);
            this.toast.success(this.i18n.spaceForm.toastCreated);
            this.spaceSaved.emit(created);
            this.formClosed.emit();
          },
          error: (err) => {
            this.loadingSubmit.set(false);
            this.handleError(err);
          },
        });
    }
  }

  handleError(err: any): void {
    if (err?.status === 409) {
      this.nameError.set(this.i18n.spaceForm.errors.conflictName);
    } else if (err?.status === 403) {
      this.serverError.set(this.i18n.spaceForm.errors.forbidden);
    } else if (err?.status === 404) {
      this.serverError.set(this.i18n.spaceForm.errors.notFoundProgram);
      if (this.selectedSchoolId()) {
        this.loadPrograms(this.selectedSchoolId());
      }
    } else if (err?.status === 400) {
      const msg = err.error?.message;
      this.serverError.set(Array.isArray(msg) ? msg.join(', ') : msg || 'Données invalides.');
    } else {
      this.serverError.set(this.i18n.spaceForm.errors.networkError);
    }
  }

  onCancel(): void {
    this.formClosed.emit();
  }
}
