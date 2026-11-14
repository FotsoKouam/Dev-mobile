import {
  Component,
  OnInit,
  AfterViewInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { DocumentsApiService } from '../../core/api/documents-api.service';
import { SpacesApiService } from '../../core/api/spaces-api.service';
import { SessionService } from '../../core/session.service';
import { School, Program } from '../../core/api/models/school.model';
import { Space } from '../../core/api/models/space.model';
import {
  DocumentItem,
  DocumentStats,
  DocumentFileType,
  DocumentStatus,
} from '../../core/api/models/document.model';
import { AdminLayoutComponent } from '../../shared/layout/admin-layout.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { DataTableComponent, ColumnDef } from '../../shared/ui/data-table/data-table.component';
import { SpaceFormComponent } from '../../shared/ui/space-form/space-form.component';
import { DocumentUploadComponent } from './document-upload/document-upload.component';
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
    StatusBadgeComponent,
    DataTableComponent,
    SpaceFormComponent,
    DocumentUploadComponent,
    DocumentDetailComponent,
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css',
})
export class DocumentsComponent implements OnInit, AfterViewInit {
  private readonly documentsApi = inject(DocumentsApiService);
  private readonly spacesApi = inject(SpacesApiService);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly i18n = I18N_FR;

  @ViewChild('docNameTpl') docNameTpl!: TemplateRef<any>;
  @ViewChild('docTypeTpl') docTypeTpl!: TemplateRef<any>;
  @ViewChild('docSchoolTpl') docSchoolTpl!: TemplateRef<any>;
  @ViewChild('docProgramTpl') docProgramTpl!: TemplateRef<any>;
  @ViewChild('docSpaceTpl') docSpaceTpl!: TemplateRef<any>;
  @ViewChild('docVersionTpl') docVersionTpl!: TemplateRef<any>;
  @ViewChild('docStatusTpl') docStatusTpl!: TemplateRef<any>;
  @ViewChild('docAddedByTpl') docAddedByTpl!: TemplateRef<any>;
  @ViewChild('docDateTpl') docDateTpl!: TemplateRef<any>;
  @ViewChild('docActionsTpl') docActionsTpl!: TemplateRef<any>;

  columns: ColumnDef<DocumentItem>[] = [];

  // Filtres
  readonly selectedSchoolId = signal<string>('');
  readonly selectedProgramId = signal<string>('');
  readonly selectedSpaceId = signal<string>('');
  readonly selectedFileType = signal<string>('');
  readonly selectedStatus = signal<string>('');
  readonly searchQuery = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly totalItems = signal<number>(0);

  get paginationMeta(): { page: number; limit: number; total: number } {
    return {
      page: this.currentPage(),
      limit: this.pageSize(),
      total: this.totalItems(),
    };
  }

  // Recherche avec debounce
  private readonly searchSubject = new Subject<string>();

  // Données réelles
  readonly schools = signal<School[]>([]);
  readonly programs = signal<Program[]>([]);
  readonly spaces = signal<Space[]>([]);
  readonly documents = signal<DocumentItem[]>([]);
  readonly stats = signal<DocumentStats | null>(null);

  // États de chargement
  readonly loadingSchools = signal<boolean>(false);
  readonly loadingPrograms = signal<boolean>(false);
  readonly loadingSpaces = signal<boolean>(false);
  readonly loadingDocuments = signal<boolean>(false);
  readonly loadingStats = signal<boolean>(false);
  readonly errorStats = signal<boolean>(false);

  // Modals & Panneaux
  readonly isCreateSpaceModalOpen = signal<boolean>(false);
  readonly isUploadModalOpen = signal<boolean>(false);
  readonly isDetailPanelOpen = signal<boolean>(false);
  readonly selectedDocument = signal<DocumentItem | null>(null);

  get canAddDocument(): boolean {
    return this.sessionService.hasPermission('add_document');
  }

  get canCreateInstitutionalSpace(): boolean {
    return this.sessionService.hasPermission('create_institutional_space');
  }

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.updateQueryParams();
        this.loadDocuments();
      });

    this.route.queryParams.subscribe((params) => {
      let shouldReload = false;

      if (params['schoolId'] && params['schoolId'] !== this.selectedSchoolId()) {
        this.selectedSchoolId.set(params['schoolId']);
        this.loadPrograms(params['schoolId']);
        shouldReload = true;
      }
      if (params['programId'] && params['programId'] !== this.selectedProgramId()) {
        this.selectedProgramId.set(params['programId']);
        this.loadSpaces(params['programId']);
        shouldReload = true;
      }
      if (params['spaceId'] && params['spaceId'] !== this.selectedSpaceId()) {
        this.selectedSpaceId.set(params['spaceId']);
        shouldReload = true;
      }
      if (params['fileType'] && params['fileType'] !== this.selectedFileType()) {
        this.selectedFileType.set(params['fileType']);
        shouldReload = true;
      }
      if (params['status'] && params['status'] !== this.selectedStatus()) {
        this.selectedStatus.set(params['status']);
        shouldReload = true;
      }
      if (params['search'] && params['search'] !== this.searchQuery()) {
        this.searchQuery.set(params['search']);
        shouldReload = true;
      }
      if (params['page']) {
        const p = parseInt(params['page'], 10);
        if (!isNaN(p) && p > 0 && p !== this.currentPage()) {
          this.currentPage.set(p);
          shouldReload = true;
        }
      }

      if (shouldReload) {
        this.loadDocuments();
        this.loadStats();
      }
    });

    this.loadSchools();
    this.loadStats();
    this.loadDocuments();
  }

  ngAfterViewInit(): void {
    this.initColumns();
  }

  initColumns(): void {
    this.columns = [
      {
        key: 'name',
        header: this.i18n.documentsPage.table.documentName,
        template: this.docNameTpl,
      },
      {
        key: 'type',
        header: this.i18n.documentsPage.table.type,
        width: '90px',
        template: this.docTypeTpl,
      },
      {
        key: 'school',
        header: this.i18n.documentsPage.table.school,
        template: this.docSchoolTpl,
      },
      {
        key: 'program',
        header: this.i18n.documentsPage.table.program,
        template: this.docProgramTpl,
      },
      {
        key: 'space',
        header: this.i18n.documentsPage.table.space,
        template: this.docSpaceTpl,
      },
      {
        key: 'version',
        header: this.i18n.documentsPage.table.version,
        width: '75px',
        template: this.docVersionTpl,
      },
      {
        key: 'status',
        header: this.i18n.documentsPage.table.status,
        width: '120px',
        template: this.docStatusTpl,
      },
      {
        key: 'addedBy',
        header: this.i18n.documentsPage.table.addedBy,
        template: this.docAddedByTpl,
      },
      {
        key: 'createdAt',
        header: this.i18n.documentsPage.table.addedAt,
        width: '110px',
        template: this.docDateTpl,
      },
      {
        key: 'actions',
        header: this.i18n.documentsPage.table.actions,
        width: '80px',
        align: 'right',
        template: this.docActionsTpl,
      },
    ];
  }

  loadStats(): void {
    this.loadingStats.set(true);
    this.errorStats.set(false);

    const sId = this.selectedSchoolId() || undefined;
    const pId = this.selectedProgramId() || undefined;

    this.documentsApi.getStats(sId, pId).subscribe({
      next: (res) => {
        this.stats.set(res);
        this.loadingStats.set(false);
      },
      error: () => {
        this.stats.set(null);
        this.loadingStats.set(false);
        this.errorStats.set(true);
      },
    });
  }

  loadDocuments(): void {
    this.loadingDocuments.set(true);

    this.documentsApi
      .getDocuments({
        page: this.currentPage(),
        limit: this.pageSize(),
        schoolId: this.selectedSchoolId() || undefined,
        programId: this.selectedProgramId() || undefined,
        spaceId: this.selectedSpaceId() || undefined,
        fileType: (this.selectedFileType() as DocumentFileType) || undefined,
        status: (this.selectedStatus() as DocumentStatus) || undefined,
        search: this.searchQuery() || undefined,
      })
      .subscribe({
        next: (page) => {
          this.documents.set(page?.data || []);
          this.totalItems.set(page?.meta?.total ?? page?.data?.length ?? 0);
          this.loadingDocuments.set(false);
        },
        error: () => {
          this.documents.set([]);
          this.totalItems.set(0);
          this.loadingDocuments.set(false);
        },
      });
  }

  loadSchools(): void {
    this.loadingSchools.set(true);
    this.spacesApi.getSchools(100).subscribe({
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
    this.spacesApi.getSchoolPrograms(schoolId).subscribe({
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
    this.spacesApi
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

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onSchoolFilterChange(schoolId: string): void {
    this.selectedSchoolId.set(schoolId);
    this.selectedProgramId.set('');
    this.selectedSpaceId.set('');
    this.spaces.set([]);
    this.currentPage.set(1);
    this.loadPrograms(schoolId);
    this.updateQueryParams();
    this.loadDocuments();
    this.loadStats();
  }

  onProgramFilterChange(programId: string): void {
    this.selectedProgramId.set(programId);
    this.selectedSpaceId.set('');
    this.currentPage.set(1);
    this.loadSpaces(programId);
    this.updateQueryParams();
    this.loadDocuments();
    this.loadStats();
  }

  onSpaceFilterChange(spaceId: string): void {
    this.selectedSpaceId.set(spaceId);
    this.currentPage.set(1);
    this.updateQueryParams();
    this.loadDocuments();
  }

  onFileTypeFilterChange(type: string): void {
    this.selectedFileType.set(type);
    this.currentPage.set(1);
    this.updateQueryParams();
    this.loadDocuments();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.updateQueryParams();
    this.loadDocuments();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.updateQueryParams();
    this.loadDocuments();
  }

  updateQueryParams(): void {
    const q: Record<string, string | number | undefined> = {};
    if (this.selectedSchoolId()) q['schoolId'] = this.selectedSchoolId();
    if (this.selectedProgramId()) q['programId'] = this.selectedProgramId();
    if (this.selectedSpaceId()) q['spaceId'] = this.selectedSpaceId();
    if (this.selectedFileType()) q['fileType'] = this.selectedFileType();
    if (this.selectedStatus()) q['status'] = this.selectedStatus();
    if (this.searchQuery()) q['search'] = this.searchQuery();
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

  openUploadModal(): void {
    this.isUploadModalOpen.set(true);
  }

  onDocumentUploaded(_newDoc: DocumentItem): void {
    this.loadDocuments();
    this.loadStats();
  }

  openDocumentDetail(doc: DocumentItem): void {
    this.documentsApi.getDocument(doc.id).subscribe({
      next: (freshDoc) => {
        this.selectedDocument.set(freshDoc);
        this.isDetailPanelOpen.set(true);
      },
      error: () => {
        this.selectedDocument.set(doc);
        this.isDetailPanelOpen.set(true);
      },
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }
}
