import { Component, OnInit, inject, ViewChild, TemplateRef, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminLayoutComponent } from '../../shared/layout/admin-layout.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { TypeBadgeComponent } from '../../shared/ui/type-badge/type-badge.component';
import { DataTableComponent, ColumnDef } from '../../shared/ui/data-table/data-table.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ErrorBannerComponent } from '../../shared/ui/error-banner/error-banner.component';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { SchoolFormComponent } from './school-form/school-form.component';
import { SchoolDetailComponent, DetailTab } from './school-detail/school-detail.component';
import { ProgramFormComponent } from './program-form/program-form.component';
import { SchoolsApiService } from '../../core/api/schools-api.service';
import { SessionService } from '../../core/session.service';
import {
  School,
  SchoolStats,
  Program,
  PageMeta,
  CreateSchoolDto,
  UpdateSchoolDto,
  CreateProgramDto,
  UpdateProgramDto,
  SchoolType,
  EntityStatus,
} from '../../core/api/models/school.model';
import { I18N_FR } from '../../shared/i18n/fr';

@Component({
  selector: 'app-schools',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminLayoutComponent,
    StatCardComponent,
    StatusBadgeComponent,
    TypeBadgeComponent,
    DataTableComponent,
    EmptyStateComponent,
    ErrorBannerComponent,
    SchoolFormComponent,
    SchoolDetailComponent,
    ProgramFormComponent,
  ],
  templateUrl: './schools.component.html',
  styleUrl: './schools.component.css',
})
export class SchoolsComponent implements OnInit, AfterViewInit {
  @ViewChild('cellName') cellNameTpl!: TemplateRef<any>;
  @ViewChild('cellType') cellTypeTpl!: TemplateRef<any>;
  @ViewChild('cellStatus') cellStatusTpl!: TemplateRef<any>;
  @ViewChild('cellActions') cellActionsTpl!: TemplateRef<any>;
  private readonly api = inject(SchoolsApiService);
  private readonly sessionService = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly i18n = I18N_FR;

  // Stats
  readonly stats = signal<SchoolStats | null>(null);
  readonly loadingStats = signal<boolean>(true);

  // Table & List
  readonly schools = signal<School[]>([]);
  readonly meta = signal<PageMeta | undefined>(undefined);
  readonly loadingSchools = signal<boolean>(false);
  readonly errorSchools = signal<boolean>(false);

  // Filters
  readonly searchTerm = signal<string>('');
  readonly selectedType = signal<SchoolType | ''>('');
  readonly selectedStatus = signal<EntityStatus | ''>('');
  readonly currentPage = signal<number>(1);

  private searchSubject = new Subject<string>();

  // Detail panel state
  readonly detailSchool = signal<School | null>(null);
  readonly isDetailOpen = signal<boolean>(false);
  readonly activeDetailTab = signal<DetailTab>('info');

  // Modal School Form
  readonly isSchoolFormOpen = signal<boolean>(false);
  readonly schoolToEdit = signal<School | null>(null);
  readonly submittingSchool = signal<boolean>(false);

  // Modal Program Form
  readonly isProgramFormOpen = signal<boolean>(false);
  readonly programToEdit = signal<Program | null>(null);
  readonly submittingProgram = signal<boolean>(false);

  // Colonnes DataTable
  columns: ColumnDef<School>[] = [];

  // Suivi de l'état des filtres pour éviter les rechargements inutiles
  private lastFilterState: string | null = null;

  get canManageSchools(): boolean {
    return this.sessionService.hasPermission('manage_schools');
  }

  get canManagePrograms(): boolean {
    return this.sessionService.hasPermission('manage_programs');
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm() || !!this.selectedType() || !!this.selectedStatus();
  }

  ngOnInit(): void {
    this.initColumns();
    this.setupSearchDebounce();

    // Lire les query params — ne recharger la liste que si les filtres changent
    this.route.queryParams.subscribe((params) => {
      const page = params['page'] ? parseInt(params['page'], 10) : 1;
      const type: SchoolType | '' = params['type'] || '';
      const status: EntityStatus | '' = params['status'] || '';
      const search: string = params['search'] || '';
      const schoolId: string | undefined = params['school'];
      const tab = params['tab'] as DetailTab;

      const filterState = `${page}-${type}-${status}-${search}`;
      const filtersChanged = filterState !== this.lastFilterState;

      this.currentPage.set(page);
      this.selectedType.set(type);
      this.selectedStatus.set(status);
      this.searchTerm.set(search);

      if (tab) {
        this.activeDetailTab.set(tab);
      }

      // Recharger la liste uniquement si les filtres ou la pagination changent
      if (filtersChanged) {
        this.lastFilterState = filterState;
        this.loadSchools();
      }

      // Ouvrir le panneau détail uniquement si l'école change
      if (schoolId) {
        if (this.detailSchool()?.id !== schoolId) {
          this.openDetailById(schoolId);
        }
        this.isDetailOpen.set(true);
      } else {
        this.isDetailOpen.set(false);
        this.detailSchool.set(null);
      }
    });

    this.loadStats();
  }

  ngAfterViewInit(): void {
    this.initColumns();
  }

  private initColumns(): void {
    this.columns = [
      { key: 'name', header: this.i18n.schools.table.schoolName, template: this.cellNameTpl },
      { key: 'type', header: this.i18n.schools.table.type, width: '110px', template: this.cellTypeTpl },
      { key: 'city', header: this.i18n.schools.table.city, width: '140px' },
      { key: 'status', header: this.i18n.schools.table.status, width: '110px', template: this.cellStatusTpl },
      { key: 'usersCount', header: this.i18n.schools.table.users, width: '100px', align: 'center' },
      { key: 'programsCount', header: this.i18n.schools.table.programs, width: '90px', align: 'center' },
      { key: 'spacesCount', header: this.i18n.schools.table.spaces, width: '90px', align: 'center' },
      { key: 'actions', header: '', width: '90px', align: 'right', template: this.cellActionsTpl },
    ];
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.updateQueryParams({ search: term || null, page: 1 });
      });
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  onTypeChange(type: SchoolType | ''): void {
    this.selectedType.set(type);
    this.updateQueryParams({ type: type || null, page: 1 });
  }

  onStatusChange(status: EntityStatus | ''): void {
    this.selectedStatus.set(status);
    this.updateQueryParams({ status: status || null, page: 1 });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedType.set('');
    this.selectedStatus.set('');
    this.updateQueryParams({
      search: null,
      type: null,
      status: null,
      page: 1,
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.updateQueryParams({ page: page > 1 ? page : null });
  }

  private updateQueryParams(params: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  loadStats(): void {
    this.loadingStats.set(true);
    this.api.getStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.loadingStats.set(false);
      },
      error: () => {
        this.stats.set(null);
        this.loadingStats.set(false);
      },
    });
  }

  loadSchools(): void {
    this.loadingSchools.set(true);
    this.errorSchools.set(false);

    this.api
      .getSchools({
        page: this.currentPage(),
        limit: 10,
        type: this.selectedType() || undefined,
        status: this.selectedStatus() || undefined,
        search: this.searchTerm().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.schools.set(res.data || []);
          this.meta.set(res.meta);
          this.loadingSchools.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement des écoles:', err);
          this.errorSchools.set(true);
          this.loadingSchools.set(false);
        },
      });
  }

  // --- Gestion du panneau détail ---
  openDetail(school: School): void {
    this.detailSchool.set(school);
    this.isDetailOpen.set(true);
    this.updateQueryParams({ school: school.id, tab: this.activeDetailTab() || 'info' });
  }

  openDetailById(id: string): void {
    this.api.getSchool(id).subscribe({
      next: (school) => {
        this.detailSchool.set(school);
        this.isDetailOpen.set(true);
      },
      error: () => {
        this.closeDetail();
      },
    });
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
    this.detailSchool.set(null);
    this.updateQueryParams({ school: null, tab: null });
  }

  onDetailTabChange(tab: DetailTab): void {
    this.activeDetailTab.set(tab);
    this.updateQueryParams({ tab });
  }

  // --- Modal Création / Modification d'école ---
  openCreateSchool(): void {
    this.schoolToEdit.set(null);
    this.isSchoolFormOpen.set(true);
  }

  openEditSchool(school: School): void {
    this.schoolToEdit.set(school);
    this.isSchoolFormOpen.set(true);
  }

  closeSchoolForm(): void {
    this.isSchoolFormOpen.set(false);
    this.schoolToEdit.set(null);
  }

  onSaveSchool(dto: CreateSchoolDto | UpdateSchoolDto, formComp: SchoolFormComponent): void {
    this.submittingSchool.set(true);

    const schoolToEditVal = this.schoolToEdit();
    if (schoolToEditVal) {
      this.api.updateSchool(schoolToEditVal.id, dto as UpdateSchoolDto).subscribe({
        next: (updated) => {
          this.submittingSchool.set(false);
          this.closeSchoolForm();
          this.toast.success(this.i18n.schools.form.toastUpdated);
          this.loadSchools();
          this.loadStats();
          if (this.detailSchool()?.id === updated.id) {
            this.detailSchool.set(updated);
          }
        },
        error: (err) => {
          this.submittingSchool.set(false);
          formComp.handleApiError(err);
        },
      });
    } else {
      this.api.createSchool(dto as CreateSchoolDto).subscribe({
        next: () => {
          this.submittingSchool.set(false);
          this.closeSchoolForm();
          this.toast.success(this.i18n.schools.form.toastCreated);
          this.loadSchools();
          this.loadStats();
        },
        error: (err) => {
          this.submittingSchool.set(false);
          formComp.handleApiError(err);
        },
      });
    }
  }

  onSchoolStatusChange(event: { id: string; status: EntityStatus }): void {
    this.api.updateSchool(event.id, { status: event.status }).subscribe({
      next: (updated) => {
        this.toast.success(this.i18n.schools.form.toastUpdated);
        this.loadSchools();
        this.loadStats();
        if (this.detailSchool()?.id === updated.id) {
          this.detailSchool.set(updated);
        }
      },
    });
  }

  // --- Modal Filière ---
  openAddProgram(): void {
    this.programToEdit.set(null);
    this.isProgramFormOpen.set(true);
  }

  openEditProgram(prog: Program): void {
    this.programToEdit.set(prog);
    this.isProgramFormOpen.set(true);
  }

  closeProgramForm(): void {
    this.isProgramFormOpen.set(false);
    this.programToEdit.set(null);
  }

  onSaveProgram(dto: CreateProgramDto | UpdateProgramDto, formComp: ProgramFormComponent, detailComp: SchoolDetailComponent): void {
    const detailSchoolVal = this.detailSchool();
    if (!detailSchoolVal) return;
    this.submittingProgram.set(true);

    const progToEditVal = this.programToEdit();
    if (progToEditVal) {
      this.api.updateProgram(progToEditVal.id, dto as UpdateProgramDto).subscribe({
        next: () => {
          this.submittingProgram.set(false);
          this.closeProgramForm();
          this.toast.success(this.i18n.schools.programForm.toastUpdated);
          detailComp.loadPrograms();
          this.loadSchools();
          this.loadStats();
        },
        error: (err) => {
          this.submittingProgram.set(false);
          formComp.handleApiError(err);
        },
      });
    } else {
      this.api.createProgram(detailSchoolVal.id, dto as CreateProgramDto).subscribe({
        next: () => {
          this.submittingProgram.set(false);
          this.closeProgramForm();
          this.toast.success(this.i18n.schools.programForm.toastCreated);
          detailComp.loadPrograms();
          this.loadSchools();
          this.loadStats();
        },
        error: (err) => {
          this.submittingProgram.set(false);
          formComp.handleApiError(err);
        },
      });
    }
  }
}
