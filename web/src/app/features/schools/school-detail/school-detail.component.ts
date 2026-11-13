import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidePanelComponent } from '../../../shared/ui/side-panel/side-panel.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { TypeBadgeComponent } from '../../../shared/ui/type-badge/type-badge.component';
import { DataTableComponent, ColumnDef } from '../../../shared/ui/data-table/data-table.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SchoolsApiService } from '../../../core/api/schools-api.service';
import { SpacesApiService } from '../../../core/api/spaces-api.service';
import { School, Program, Page, PageMeta } from '../../../core/api/models/school.model';
import { Space } from '../../../core/api/models/space.model';
import { SpaceFormComponent } from '../../../shared/ui/space-form/space-form.component';
import { SessionService } from '../../../core/session.service';
import { I18N_FR } from '../../../shared/i18n/fr';

export type DetailTab = 'info' | 'programs' | 'users' | 'spaces';

@Component({
  selector: 'app-school-detail',
  standalone: true,
  imports: [
    CommonModule,
    SidePanelComponent,
    StatusBadgeComponent,
    TypeBadgeComponent,
    EmptyStateComponent,
    ModalComponent,
    SpaceFormComponent,
  ],
  template: `
    @if (school) {
      <app-side-panel
        [isOpen]="isOpen"
        [title]="school.name"
        [subtitle]="school.city"
        (closePanel)="close()"
      >
        <div headerIcon class="school-header-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M3 21h18M3 7v14M21 7v14M6 21V11M18 21V11M12 21V11M3 7l9-4 9 4"></path>
          </svg>
        </div>
        <div headerBadge>
          <app-status-badge [status]="school.status"></app-status-badge>
        </div>

        <!-- Onglets -->
        <div class="panel-tabs" role="tablist">
          <button
            class="tab-btn"
            [class.active]="activeTab === 'info'"
            (click)="selectTab('info')"
            role="tab"
          >
            {{ i18n.schools.detail.tabs.info }}
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'programs'"
            (click)="selectTab('programs')"
            role="tab"
          >
            {{ i18n.schools.detail.tabs.programs }}
            @if (programs().length > 0) {
              <span class="tab-pill">{{ programsMeta()?.total ?? programs().length }}</span>
            }
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'users'"
            (click)="selectTab('users')"
            role="tab"
          >
            {{ i18n.schools.detail.tabs.users }}
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'spaces'"
            (click)="selectTab('spaces')"
            role="tab"
          >
            {{ i18n.schools.detail.tabs.spaces }}
          </button>
          <button
            class="tab-btn disabled-tab"
            role="tab"
            disabled
          >
            Paramètres
          </button>
        </div>

        <!-- Contenu Onglet Informations -->
        @if (activeTab === 'info') {
          <div class="tab-pane info-pane">
            <div class="info-actions-bar">
              @if (canManageSchools) {
                <!-- Interrupteur de statut -->
                <div class="status-toggle-wrapper">
                  <label class="switch">
                    <input
                      type="checkbox"
                      [checked]="school.status === 'active'"
                      (change)="onStatusToggleChange($event)"
                    />
                    <span class="slider"></span>
                  </label>
                  <span class="toggle-label">{{ i18n.schools.detail.statusSwitch }}</span>
                </div>

                <button class="btn btn-secondary btn-sm" (click)="editSchool.emit(school)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>{{ i18n.common.modify }}</span>
                </button>
              }
            </div>

            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ i18n.schools.detail.infoLabels.type }}</span>
                <span class="info-value">
                  <app-type-badge [type]="school.type"></app-type-badge>
                </span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.schools.detail.infoLabels.city }}</span>
                <span class="info-value">{{ school.city }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.schools.detail.infoLabels.address }}</span>
                <span class="info-value">{{ school.address || i18n.schools.detail.infoLabels.notSpecified }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.schools.detail.infoLabels.phone }}</span>
                <span class="info-value">{{ school.phone || i18n.schools.detail.infoLabels.notSpecified }}</span>
              </div>

              <div class="info-item full-width">
                <span class="info-label">{{ i18n.schools.detail.infoLabels.description }}</span>
                <span class="info-value text-block">{{ school.description || i18n.schools.detail.infoLabels.notSpecified }}</span>
              </div>

              <div class="info-item full-width">
                <span class="info-label">{{ i18n.schools.detail.infoLabels.googleWorkspaceDomain }}</span>
                <span class="info-value">{{ school.googleWorkspaceDomain || i18n.schools.detail.infoLabels.notSpecified }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ i18n.schools.detail.infoLabels.mainLanguage }}</span>
                <span class="info-value">{{ school.mainLanguage === 'fr' ? i18n.schools.detail.infoLabels.french : school.mainLanguage }}</span>
              </div>
            </div>
          </div>
        }

        <!-- Contenu Onglet Filières -->
        @if (activeTab === 'programs') {
          <div class="tab-pane programs-pane">
            <div class="programs-header">
              <div class="programs-count-title">
                {{ i18n.schools.detail.programsTab.title }}
                <span class="count-badge">({{ programsMeta()?.total ?? programs().length }})</span>
              </div>
              @if (canManagePrograms) {
                <button class="btn btn-primary btn-sm" (click)="addProgram.emit()">
                  {{ i18n.schools.detail.programsTab.addProgramBtn }}
                </button>
              }
            </div>

            @if (loadingPrograms()) {
              <div class="skeleton-box">Chargement des filières…</div>
            } @else if (programs().length === 0) {
              <app-empty-state
                [title]="i18n.schools.detail.programsTab.emptyPrograms"
                [actionLabel]="canManagePrograms ? i18n.schools.detail.programsTab.addProgramBtn : undefined"
                (action)="addProgram.emit()"
              ></app-empty-state>
            } @else {
              <div class="programs-table-wrapper">
                <table class="simple-table">
                  <thead>
                    <tr>
                      <th>{{ i18n.schools.detail.programsTab.nameCol }}</th>
                      <th>{{ i18n.schools.detail.programsTab.usersCol }}</th>
                      <th>{{ i18n.schools.detail.programsTab.spacesCol }}</th>
                      <th class="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (prog of programs(); track prog.id) {
                      <tr
                        class="program-row"
                        [class.selected]="selectedProgram()?.id === prog.id"
                        (click)="onSelectProgram(prog)"
                      >
                        <td class="font-medium">{{ prog.name }}</td>
                        <td>{{ prog.usersCount }}</td>
                        <td>{{ prog.spacesCount }}</td>
                        <td class="actions-col" (click)="$event.stopPropagation()">
                          <button
                            class="action-icon-btn"
                            (click)="onSelectProgram(prog)"
                            title="Voir"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            class="action-icon-btn"
                            (click)="editProgram.emit(prog)"
                            title="Plus d'actions"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Détail de la filière sélectionnée -->
            @if (selectedProgram()) {
              <div class="program-detail-card">
                <div class="program-detail-header">
                  <div class="program-detail-title-group">
                    <svg class="chevron-box-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-7 7a2 2 0 01-2.828 0l-7-7a2 2 0 012.828-2.828L10 11.172l2.586-2.586z" clip-rule="evenodd" />
                    </svg>
                    <span class="program-detail-title">Détail de la filière</span>
                  </div>
                  <button class="collapse-btn" title="Réduire">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div class="program-identity-card">
                  <div class="prog-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M3 21h18M3 7v14M21 7v14M6 21V11M18 21V11M12 21V11M3 7l9-4 9 4"></path>
                    </svg>
                  </div>
                  <div class="prog-info-texts">
                    <div class="prog-name-pill-row">
                      <span class="prog-name-bold">{{ selectedProgram()!.name }}</span>
                    </div>
                  </div>
                  <div class="prog-users-stat">
                    <div class="prog-users-val">{{ selectedProgram()!.usersCount }} utilisateurs</div>
                    <div class="prog-users-sub">(Personnel et Étudiants)</div>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Contenu Onglet Utilisateurs -->
        @if (activeTab === 'users') {
          <div class="tab-pane">
            <app-empty-state
              [title]="i18n.common.comingSoon"
              description="La gestion des utilisateurs sera disponible dans une prochaine tranche."
            ></app-empty-state>
          </div>
        }

        <!-- Contenu Onglet Espaces (réel) -->
        @if (activeTab === 'spaces') {
          <div class="tab-pane spaces-pane">
            <div class="spaces-pane-header">
              <span class="spaces-pane-title">Espaces institutionnels de l’école</span>
              @if (canCreateInstitutionalSpace) {
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  (click)="openCreateSpaceModal()"
                >
                  + Créer un espace
                </button>
              }
            </div>

            @if (loadingSpaces()) {
              <div class="skeleton-box">
                {{ i18n.common.loading }}
              </div>
            } @else if (schoolSpaces().length === 0) {
              <app-empty-state
                title="Aucun espace institutionnel pour cette école."
                description="Les espaces institutionnels regroupent les documents de chaque filière."
              ></app-empty-state>
            } @else {
              <div class="school-spaces-list">
                @for (sp of schoolSpaces(); track sp.id) {
                  <div class="school-space-row">
                    <div class="space-main-info">
                      <span class="space-title">{{ sp.name }}</span>
                      <div class="space-meta-line">
                        <span class="space-prog-badge">{{ sp.program?.name }}</span>
                        <span class="space-docs-count">— documents</span>
                      </div>
                    </div>
                    <div class="space-row-right">
                      <app-status-badge [status]="sp.status"></app-status-badge>
                      @if (canCreateInstitutionalSpace) {
                        <button
                          type="button"
                          class="action-icon-btn"
                          title="Modifier l'espace"
                          (click)="openEditSpaceModal(sp)"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </app-side-panel>

      <!-- Modal de confirmation de désactivation -->
      <app-modal
        [isOpen]="showDeactivateConfirm()"
        title="Désactiver l'école"
        (closeModal)="showDeactivateConfirm.set(false)"
      >
        <p class="confirm-text">
          {{ i18n.schools.detail.deactivateConfirm }}
        </p>

        <div footer class="confirm-actions">
          <button class="btn btn-secondary" (click)="showDeactivateConfirm.set(false)">
            {{ i18n.common.cancel }}
          </button>
          <button class="btn btn-danger" (click)="confirmDeactivate()">
            {{ i18n.schools.detail.deactivateBtn }}
          </button>
        </div>
      </app-modal>

      <!-- Modal Création/Modification d'espace institutionnel -->
      <app-space-form
        [isOpen]="showSpaceModal()"
        [spaceToEdit]="spaceToEdit()"
        [initialSchoolId]="school.id"
        (formClosed)="showSpaceModal.set(false)"
        (spaceSaved)="onSpaceSaved()"
      ></app-space-form>
    }
  `,
  styles: [`
    .school-header-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #F0F4FA;
      color: var(--color-primary, #1B2A4A);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .school-header-icon-box svg {
      width: 24px;
      height: 24px;
    }
    .panel-tabs {
      display: flex;
      border-bottom: 1px solid var(--color-border, #D9DFEA);
      margin-bottom: 20px;
      gap: 16px;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 10px 4px 12px 4px;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-muted, #7A8499);
      cursor: pointer;
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: color 0.15s;
    }
    .tab-btn:hover:not(:disabled) {
      color: var(--color-text-dark, #1B2A4A);
    }
    .tab-btn.active {
      color: var(--color-text-dark, #1B2A4A);
      font-weight: 600;
    }
    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2.5px;
      background: var(--color-primary, #1B2A4A);
    }
    .tab-pill {
      background: #EDF2F9;
      color: var(--color-primary, #1B2A4A);
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .disabled-tab {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .info-pane {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .info-actions-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 1px solid #EEF2F8;
    }
    .status-toggle-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toggle-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: #D9DFEA;
      transition: .2s;
      border-radius: 20px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: var(--color-success, #3F8F5F);
    }
    input:checked + .slider:before {
      transform: translateX(16px);
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 20px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-item.full-width {
      grid-column: span 2;
    }
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-muted, #7A8499);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-value {
      font-size: 14px;
      color: var(--color-text-dark, #1B2A4A);
    }
    .text-block {
      line-height: 1.4;
      background: #F8FAFD;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #EEF2F8;
    }
    .programs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .programs-count-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-dark, #1B2A4A);
    }
    .count-badge {
      color: var(--color-text-muted, #7A8499);
      font-weight: 500;
    }
    .programs-table-wrapper {
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .simple-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .simple-table th {
      background: #F8FAFD;
      padding: 10px 12px;
      font-weight: 600;
      color: var(--color-text-muted, #7A8499);
      border-bottom: 1px solid var(--color-border, #D9DFEA);
      text-align: left;
    }
    .simple-table td {
      padding: 12px;
      border-bottom: 1px solid #EEF2F8;
      color: var(--color-text-dark, #1B2A4A);
    }
    .simple-table tr:last-child td { border-bottom: none; }
    .program-row {
      cursor: pointer;
      transition: background 0.15s;
    }
    .program-row:hover { background: #F6F9FD; }
    .program-row.selected { background: #EBF3FC; }
    .actions-col { width: 44px; text-align: right; }
    .action-icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted, #7A8499);
      padding: 4px;
      border-radius: 4px;
    }
    .action-icon-btn:hover { color: var(--color-accent, #4A6FA5); }
    .action-icon-btn svg { width: 16px; height: 16px; }
    .program-detail-card {
      background: #FFFFFF;
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 6px;
    }
    .program-detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .program-detail-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .chevron-box-icon {
      width: 16px;
      height: 16px;
      color: var(--color-text-dark, #1B2A4A);
    }
    .program-detail-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-dark, #1B2A4A);
    }
    .collapse-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #7A8499;
      padding: 2px;
    }
    .collapse-btn svg {
      width: 16px;
      height: 16px;
    }
    .program-identity-card {
      background: #F8FAFD;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .prog-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: #EBF3FC;
      color: #2F6FED;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .prog-icon-box svg {
      width: 20px;
      height: 20px;
    }
    .prog-info-texts {
      flex: 1;
      min-width: 0;
    }
    .prog-name-pill-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prog-name-bold {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-dark, #1B2A4A);
    }
    .spaces-pill {
      font-size: 11px;
      color: #2F6FED;
      background: #EBF3FC;
      padding: 2px 8px;
      border-radius: 12px;
      display: inline-block;
      width: fit-content;
      font-weight: 500;
    }
    .prog-users-stat {
      text-align: right;
    }
    .prog-users-val {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-dark, #1B2A4A);
    }
    .prog-users-sub {
      font-size: 11px;
      color: var(--color-text-muted, #7A8499);
    }
    .spaces-sub-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 4px;
    }
    .spaces-sub-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-dark, #1B2A4A);
    }
    .spaces-mini-table {
      border: 1px solid #EEF2F8;
      border-radius: 6px;
      overflow: hidden;
    }
    .spaces-table-header {
      background: #F8FAFD;
      padding: 8px 12px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--color-text-muted, #7A8499);
      display: grid;
      grid-template-columns: 2fr 1.4fr 1.2fr 0.8fr;
      align-items: center;
      border-bottom: 1px solid #EEF2F8;
    }
    .spaces-table-row {
      padding: 10px 12px;
      font-size: 12.5px;
      display: grid;
      grid-template-columns: 2fr 1.4fr 1.2fr 0.8fr;
      align-items: center;
      border-bottom: 1px solid #F4F6F9;
    }
    .spaces-table-row:last-child {
      border-bottom: none;
    }
    .space-row-name {
      font-weight: 500;
      color: var(--color-text-dark, #1B2A4A);
    }
    .space-row-docs {
      color: var(--color-text-muted, #7A8499);
    }
    .space-row-status {
      font-size: 11px;
      color: #9AA5B8;
      background: #F0F4FA;
      padding: 2px 6px;
      border-radius: 4px;
      width: fit-content;
    }
    .space-row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
    }
    .btn-block-create {
      width: 100%;
      height: 40px;
      justify-content: center;
      background: var(--color-primary, #1B2A4A);
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      margin-top: 8px;
    }
    .plus-icon {
      width: 16px;
      height: 16px;
    }
    .confirm-text {
      font-size: 14px;
      color: var(--color-text-dark, #1B2A4A);
      line-height: 1.5;
      margin: 0;
    }
    .confirm-actions {
      display: flex;
      gap: 12px;
    }
    .btn {
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-sm { height: 32px; padding: 0 12px; font-size: 12px; }
    .btn-primary { background: var(--color-primary, #1B2A4A); color: #fff; }
    .btn-secondary { background: #fff; border: 1px solid var(--color-border, #D9DFEA); color: var(--color-text-dark, #1B2A4A); }
    .btn-danger { background: var(--color-error, #E85D4E); color: #fff; }
    .btn-secondary:hover { background: #F8FAFD; }
    .skeleton-box { padding: 24px; text-align: center; color: #7A8499; }
  `],
})
export class SchoolDetailComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() school?: School | null;
  @Input() activeTab: DetailTab = 'info';
  @Input() canManageSchools = false;
  @Input() canManagePrograms = false;

  @Output() closeDetail = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<DetailTab>();
  @Output() editSchool = new EventEmitter<School>();
  @Output() statusChange = new EventEmitter<{ id: string; status: 'active' | 'inactive' }>();
  @Output() addProgram = new EventEmitter<void>();
  @Output() editProgram = new EventEmitter<Program>();

  private readonly api = inject(SchoolsApiService);
  private readonly spacesApi = inject(SpacesApiService);
  private readonly sessionService = inject(SessionService);
  readonly i18n = I18N_FR;

  readonly programs = signal<Program[]>([]);
  readonly programsMeta = signal<PageMeta | undefined>(undefined);
  readonly loadingPrograms = signal<boolean>(false);
  readonly selectedProgram = signal<Program | null>(null);

  readonly schoolSpaces = signal<Space[]>([]);
  readonly loadingSpaces = signal<boolean>(false);
  readonly showSpaceModal = signal<boolean>(false);
  readonly spaceToEdit = signal<Space | null>(null);

  readonly showDeactivateConfirm = signal<boolean>(false);

  // Identifiant de l'école dont les filières sont en cours de chargement
  private currentProgramSchoolId?: string;
  private currentSpaceSchoolId?: string;

  get canCreateInstitutionalSpace(): boolean {
    return this.sessionService.hasPermission('create_institutional_space');
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Réinitialiser les filières et espaces quand on change d'école
    if (changes['school']) {
      const prevId = changes['school'].previousValue?.id;
      const newId = changes['school'].currentValue?.id;
      if (prevId !== newId) {
        this.programs.set([]);
        this.selectedProgram.set(null);
        this.programsMeta.set(undefined);
        this.currentProgramSchoolId = undefined;
        this.schoolSpaces.set([]);
        this.spaceToEdit.set(null);
        this.currentSpaceSchoolId = undefined;
      }
    }

    if (this.isOpen && this.school) {
      if (this.activeTab === 'programs') {
        this.loadPrograms();
      } else if (this.activeTab === 'spaces') {
        this.loadSchoolSpaces();
      }
    }
  }

  selectTab(tab: DetailTab): void {
    this.activeTab = tab;
    this.tabChange.emit(tab);
    if (tab === 'programs' && this.school) {
      this.loadPrograms();
    } else if (tab === 'spaces' && this.school) {
      this.loadSchoolSpaces();
    }
  }

  loadSchoolSpaces(): void {
    if (!this.school) return;
    if (this.loadingSpaces() && this.currentSpaceSchoolId === this.school.id) return;

    this.loadingSpaces.set(true);
    this.currentSpaceSchoolId = this.school.id;
    this.spacesApi.getSpaces({ schoolId: this.school.id, limit: 50 }).subscribe({
      next: (page) => {
        this.schoolSpaces.set(page.data || []);
        this.loadingSpaces.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement des espaces:', err);
        this.schoolSpaces.set([]);
        this.loadingSpaces.set(false);
      },
    });
  }

  openCreateSpaceModal(): void {
    this.spaceToEdit.set(null);
    this.showSpaceModal.set(true);
  }

  openEditSpaceModal(space: Space): void {
    this.spaceToEdit.set(space);
    this.showSpaceModal.set(true);
  }

  onSpaceSaved(): void {
    this.showSpaceModal.set(false);
    this.currentSpaceSchoolId = undefined;
    this.loadSchoolSpaces();
  }

  loadPrograms(): void {
    if (!this.school) return;
    // Éviter les doubles chargements pour la même école
    if (this.loadingPrograms() && this.currentProgramSchoolId === this.school.id) return;

    this.loadingPrograms.set(true);
    this.currentProgramSchoolId = this.school.id;
    this.api.getPrograms(this.school.id, { limit: 50 }).subscribe({
      next: (res) => {
        this.programs.set(res.data || []);
        this.programsMeta.set(res.meta);
        this.loadingPrograms.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement des filières:', err);
        this.loadingPrograms.set(false);
      },
    });
  }

  onSelectProgram(prog: Program): void {
    this.selectedProgram.set(this.selectedProgram()?.id === prog.id ? null : prog);
  }

  onStatusToggleChange(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (!isChecked) {
      // Confirmer avant de désactiver
      (event.target as HTMLInputElement).checked = true; // Garder coché jusqu'à confirmation
      this.showDeactivateConfirm.set(true);
    } else {
      if (this.school) {
        this.statusChange.emit({ id: this.school.id, status: 'active' });
      }
    }
  }

  confirmDeactivate(): void {
    this.showDeactivateConfirm.set(false);
    if (this.school) {
      this.statusChange.emit({ id: this.school.id, status: 'inactive' });
    }
  }

  close(): void {
    this.closeDetail.emit();
  }
}
