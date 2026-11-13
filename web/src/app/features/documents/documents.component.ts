import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SpacesApiService } from '../../core/api/spaces-api.service';
import { SessionService } from '../../core/session.service';
import { School, Program } from '../../core/api/models/school.model';
import { Space } from '../../core/api/models/space.model';
import { AdminLayoutComponent } from '../../shared/layout/admin-layout.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SpaceFormComponent } from '../../shared/ui/space-form/space-form.component';
import { DocumentDetailComponent } from './document-detail/document-detail.component';
import { I18N_FR } from '../../shared/i18n/fr';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminLayoutComponent,
    StatCardComponent,
    EmptyStateComponent,
    SpaceFormComponent,
    DocumentDetailComponent,
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css',
})
export class DocumentsComponent implements OnInit {
  private readonly api = inject(SpacesApiService);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly i18n = I18N_FR;

  // Filtres
  readonly selectedSchoolId = signal<string>('');
  readonly selectedProgramId = signal<string>('');
  readonly selectedSpaceId = signal<string>('');
  readonly currentPage = signal<number>(1);

  // Données réelles
  readonly schools = signal<School[]>([]);
  readonly programs = signal<Program[]>([]);
  readonly spaces = signal<Space[]>([]);

  // États de chargement
  readonly loadingSchools = signal<boolean>(false);
  readonly loadingPrograms = signal<boolean>(false);
  readonly loadingSpaces = signal<boolean>(false);

  // Modals & Panneaux
  readonly isCreateSpaceModalOpen = signal<boolean>(false);
  readonly isDetailPanelOpen = signal<boolean>(false);

  get canAddDocument(): boolean {
    return this.sessionService.hasPermission('add_document');
  }

  get canCreateInstitutionalSpace(): boolean {
    return this.sessionService.hasPermission('create_institutional_space');
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['schoolId'] && params['schoolId'] !== this.selectedSchoolId()) {
        this.selectedSchoolId.set(params['schoolId']);
        this.loadPrograms(params['schoolId']);
      }
      if (params['programId'] && params['programId'] !== this.selectedProgramId()) {
        this.selectedProgramId.set(params['programId']);
        this.loadSpaces(params['programId']);
      }
      if (params['spaceId'] && params['spaceId'] !== this.selectedSpaceId()) {
        this.selectedSpaceId.set(params['spaceId']);
      }
      if (params['page']) {
        const p = parseInt(params['page'], 10);
        if (!isNaN(p) && p > 0) {
          this.currentPage.set(p);
        }
      }
    });

    this.loadSchools();
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
      this.spaces.set([]);
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

  loadSpaces(programId: string): void {
    if (!programId) {
      this.spaces.set([]);
      return;
    }
    this.loadingSpaces.set(true);
    this.api
      .getSpaces({
        programId,
        schoolId: this.selectedSchoolId() || undefined,
        limit: 100,
      })
      .subscribe({
        next: (page) => {
          this.spaces.set(page.data || []);
          this.loadingSpaces.set(false);
        },
        error: () => {
          this.spaces.set([]);
          this.loadingSpaces.set(false);
        },
      });
  }

  onSchoolFilterChange(schoolId: string): void {
    this.selectedSchoolId.set(schoolId);
    this.selectedProgramId.set('');
    this.selectedSpaceId.set('');
    this.spaces.set([]);
    this.currentPage.set(1);
    this.loadPrograms(schoolId);
    this.updateQueryParams();
  }

  onProgramFilterChange(programId: string): void {
    this.selectedProgramId.set(programId);
    this.selectedSpaceId.set('');
    this.currentPage.set(1);
    this.loadSpaces(programId);
    this.updateQueryParams();
  }

  onSpaceFilterChange(spaceId: string): void {
    this.selectedSpaceId.set(spaceId);
    this.currentPage.set(1);
    this.updateQueryParams();
  }

  updateQueryParams(): void {
    const q: Record<string, string | number | undefined> = {};
    if (this.selectedSchoolId()) q['schoolId'] = this.selectedSchoolId();
    if (this.selectedProgramId()) q['programId'] = this.selectedProgramId();
    if (this.selectedSpaceId()) q['spaceId'] = this.selectedSpaceId();
    if (this.currentPage() > 1) q['page'] = this.currentPage();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q,
    });
  }

  openCreateSpaceModal(): void {
    this.isCreateSpaceModalOpen.set(true);
  }

  onSpaceCreated(space: Space): void {
    if (this.selectedProgramId() === space.program?.id) {
      this.loadSpaces(this.selectedProgramId());
    }
  }
}

