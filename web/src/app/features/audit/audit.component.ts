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
import { AuditApiService } from '../../core/api/audit-api.service';
import { SessionService } from '../../core/session.service';
import {
  AuditAction,
  AuditLogItem,
  AuditResult,
  AuditStats,
} from '../../core/api/models/audit.model';
import { AdminLayoutComponent } from '../../shared/layout/admin-layout.component';
import { StatCardComponent } from '../../shared/ui/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { DataTableComponent, ColumnDef } from '../../shared/ui/data-table/data-table.component';
import { AuditDetailComponent } from './audit-detail/audit-detail.component';
import { I18N_FR } from '../../shared/i18n/fr';

const DEFAULT_DAYS_AGO = 30;
const MAX_PERIOD_DAYS = 366;

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminLayoutComponent,
    StatCardComponent,
    EmptyStateComponent,
    DataTableComponent,
    AuditDetailComponent,
  ],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
})
export class AuditComponent implements OnInit, AfterViewInit {
  private readonly auditApi = inject(AuditApiService);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly i18n = I18N_FR;

  @ViewChild('dateTpl') dateTpl!: TemplateRef<any>;
  @ViewChild('userTpl') userTpl!: TemplateRef<any>;
  @ViewChild('actionTpl') actionTpl!: TemplateRef<any>;
  @ViewChild('targetTpl') targetTpl!: TemplateRef<any>;
  @ViewChild('ipTpl') ipTpl!: TemplateRef<any>;
  @ViewChild('resultTpl') resultTpl!: TemplateRef<any>;
  @ViewChild('actionsTpl') actionsTpl!: TemplateRef<any>;

  columns: ColumnDef<AuditLogItem>[] = [];

  // Filtres
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly selectedAction = signal<string>('');
  readonly selectedResult = signal<string>('');
  readonly searchQuery = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly totalItems = signal<number>(0);

  // Erreur de validation de date locale
  readonly dateError = signal<string>('');

  get paginationMeta(): { page: number; limit: number; total: number } {
    return {
      page: this.currentPage(),
      limit: this.pageSize(),
      total: this.totalItems(),
    };
  }

  // Recherche avec debounce 300 ms
  private readonly searchSubject = new Subject<string>();

  // Données
  readonly auditLogs = signal<AuditLogItem[]>([]);
  readonly stats = signal<AuditStats | null>(null);

  // États de chargement
  readonly loadingStats = signal<boolean>(false);
  readonly errorStats = signal<boolean>(false);
  readonly loadingAuditLogs = signal<boolean>(false);
  readonly error403 = signal<boolean>(false);

  // Panneau de détail
  readonly isDetailPanelOpen = signal<boolean>(false);
  readonly selectedAuditLog = signal<AuditLogItem | null>(null);

  get hasActiveFilters(): boolean {
    return (
      !!this.selectedAction() ||
      !!this.selectedResult() ||
      !!this.searchQuery() ||
      this.fromDate() !== this.getDefaultFrom() ||
      this.toDate() !== this.getDefaultTo()
    );
  }

  get canViewAudit(): boolean {
    return (
      this.sessionService.hasPermission('view_audit_log') ||
      this.sessionService.hasPermission('view_audit_logs')
    );
  }

  ngOnInit(): void {
    if (!this.canViewAudit) {
      this.error403.set(true);
      return;
    }

    // Initialiser les dates par défaut (30 derniers jours)
    this.fromDate.set(this.getDefaultFrom());
    this.toDate.set(this.getDefaultTo());

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.updateQueryParams();
        this.loadAuditLogs();
      });

    this.route.queryParams.subscribe((params) => {
      let shouldReload = false;

      if (params['from'] && params['from'] !== this.fromDate()) {
        this.fromDate.set(params['from']);
        shouldReload = true;
      }
      if (params['to'] && params['to'] !== this.toDate()) {
        this.toDate.set(params['to']);
        shouldReload = true;
      }
      if (params['action'] && params['action'] !== this.selectedAction()) {
        this.selectedAction.set(params['action']);
        shouldReload = true;
      }
      if (params['result'] && params['result'] !== this.selectedResult()) {
        this.selectedResult.set(params['result']);
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

      // Si un paramètre event=<id> est présent dans l'URL, ouvrir le panneau
      if (params['event']) {
        this.openEventFromId(params['event']);
      }

      if (shouldReload) {
        this.validateAndLoad();
      }
    });

    this.validateAndLoad();
  }

  ngAfterViewInit(): void {
    this.initColumns();
  }

  initColumns(): void {
    const cols: ColumnDef<AuditLogItem>[] = [
      {
        key: 'createdAt',
        header: this.i18n.auditPage.table.dateTime,
        width: '160px',
        template: this.dateTpl,
      },
      {
        key: 'user',
        header: this.i18n.auditPage.table.user,
        template: this.userTpl,
      },
      {
        key: 'action',
        header: this.i18n.auditPage.table.action,
        width: '170px',
        template: this.actionTpl,
      },
      // Colonne Cible masquée tant que target est null
    ];

    // Vérifier si des éléments ont un target non-null
    const hasAnyTarget = this.auditLogs().some((item) => !!item.target);
    if (hasAnyTarget) {
      cols.push({
        key: 'target',
        header: this.i18n.auditPage.table.target,
        template: this.targetTpl,
      });
    }

    cols.push(
      {
        key: 'ipAddress',
        header: this.i18n.auditPage.table.ipAddress,
        width: '130px',
        template: this.ipTpl,
      },
      {
        key: 'result',
        header: this.i18n.auditPage.table.result,
        width: '100px',
        template: this.resultTpl,
      },
      {
        key: 'actions',
        header: this.i18n.auditPage.table.actions,
        width: '70px',
        align: 'right',
        template: this.actionsTpl,
      },
    );

    this.columns = cols;
  }

  validateDates(): boolean {
    const fStr = this.fromDate();
    const tStr = this.toDate();

    this.dateError.set('');

    if (fStr && tStr) {
      const f = new Date(fStr);
      const t = new Date(tStr);

      if (f > t) {
        this.dateError.set(this.i18n.auditPage.filters.errors.fromAfterTo);
        return false;
      }

      const diffDays = (t.getTime() - f.getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays > MAX_PERIOD_DAYS) {
        this.dateError.set(this.i18n.auditPage.filters.errors.maxPeriodExceeded);
        return false;
      }
    }

    return true;
  }

  validateAndLoad(): void {
    if (!this.validateDates()) {
      return;
    }
    this.loadStats();
    this.loadAuditLogs();
  }

  loadStats(): void {
    this.loadingStats.set(true);
    this.errorStats.set(false);

    const from = this.fromDate() ? `${this.fromDate()}T00:00:00Z` : undefined;
    const to = this.toDate() ? `${this.toDate()}T23:59:59Z` : undefined;

    this.auditApi.getStats({ from, to }).subscribe({
      next: (res) => {
        this.stats.set(res);
        this.loadingStats.set(false);
      },
      error: (err) => {
        if (err?.status === 403) {
          this.error403.set(true);
        }
        this.stats.set(null);
        this.loadingStats.set(false);
        this.errorStats.set(true);
      },
    });
  }

  loadAuditLogs(): void {
    this.loadingAuditLogs.set(true);

    const from = this.fromDate() ? `${this.fromDate()}T00:00:00Z` : undefined;
    const to = this.toDate() ? `${this.toDate()}T23:59:59Z` : undefined;

    this.auditApi
      .getAuditLogs({
        page: this.currentPage(),
        limit: this.pageSize(),
        from,
        to,
        action: (this.selectedAction() as AuditAction) || undefined,
        result: (this.selectedResult() as AuditResult) || undefined,
        search: this.searchQuery() || undefined,
      })
      .subscribe({
        next: (page) => {
          this.auditLogs.set(page?.data || []);
          this.totalItems.set(page?.meta?.total ?? page?.data?.length ?? 0);
          this.loadingAuditLogs.set(false);
          this.initColumns(); // Mettre à jour au cas où target est présent
        },
        error: (err) => {
          if (err?.status === 403) {
            this.error403.set(true);
          }
          this.auditLogs.set([]);
          this.totalItems.set(0);
          this.loadingAuditLogs.set(false);
        },
      });
  }

  onFromDateChange(val: string): void {
    this.fromDate.set(val);
    this.currentPage.set(1);
    if (this.validateDates()) {
      this.updateQueryParams();
      this.loadStats();
      this.loadAuditLogs();
    }
  }

  onToDateChange(val: string): void {
    this.toDate.set(val);
    this.currentPage.set(1);
    if (this.validateDates()) {
      this.updateQueryParams();
      this.loadStats();
      this.loadAuditLogs();
    }
  }

  onActionFilterChange(val: string): void {
    this.selectedAction.set(val);
    this.currentPage.set(1);
    this.updateQueryParams();
    this.loadAuditLogs();
  }

  onResultFilterChange(val: string): void {
    this.selectedResult.set(val);
    this.currentPage.set(1);
    this.updateQueryParams();
    this.loadAuditLogs();
  }

  onSearchInput(val: string): void {
    this.searchSubject.next(val);
  }

  onResetFilters(): void {
    this.fromDate.set(this.getDefaultFrom());
    this.toDate.set(this.getDefaultTo());
    this.selectedAction.set('');
    this.selectedResult.set('');
    this.searchQuery.set('');
    this.dateError.set('');
    this.currentPage.set(1);

    this.updateQueryParams();
    this.loadStats();
    this.loadAuditLogs();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.updateQueryParams();
    this.loadAuditLogs();
  }

  updateQueryParams(): void {
    const q: Record<string, string | number | undefined> = {};
    if (this.fromDate() && this.fromDate() !== this.getDefaultFrom()) q['from'] = this.fromDate();
    if (this.toDate() && this.toDate() !== this.getDefaultTo()) q['to'] = this.toDate();
    if (this.selectedAction()) q['action'] = this.selectedAction();
    if (this.selectedResult()) q['result'] = this.selectedResult();
    if (this.searchQuery()) q['search'] = this.searchQuery();
    if (this.currentPage() > 1) q['page'] = this.currentPage();

    if (this.isDetailPanelOpen() && this.selectedAuditLog()) {
      q['event'] = this.selectedAuditLog()!.id;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q,
    });
  }

  openDetail(item: AuditLogItem): void {
    this.auditApi.getAuditLog(item.id).subscribe({
      next: (fresh) => {
        this.selectedAuditLog.set(fresh);
        this.isDetailPanelOpen.set(true);
        this.updateQueryParams();
      },
      error: () => {
        this.selectedAuditLog.set(item);
        this.isDetailPanelOpen.set(true);
        this.updateQueryParams();
      },
    });
  }

  openEventFromId(id: string): void {
    this.auditApi.getAuditLog(id).subscribe({
      next: (item) => {
        this.selectedAuditLog.set(item);
        this.isDetailPanelOpen.set(true);
      },
    });
  }

  closeDetail(): void {
    this.isDetailPanelOpen.set(false);
    this.selectedAuditLog.set(null);

    const q = { ...this.route.snapshot.queryParams };
    delete q['event'];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q,
    });
  }

  formatActionLabel(action: string): string {
    switch (action) {
      case 'login_success':
        return this.i18n.auditPage.filters.loginSuccess;
      case 'login_failure':
        return this.i18n.auditPage.filters.loginFailure;
      case 'logout':
        return this.i18n.auditPage.filters.logout;
      default:
        return action;
    }
  }

  formatRole(roleCode?: string | null): string {
    if (!roleCode) return '';
    const rolesMap: Record<string, string> = {
      platform_admin: this.i18n.roles.platform_admin,
      school_admin: this.i18n.roles.school_admin,
      staff: this.i18n.roles.staff,
      student: this.i18n.roles.student,
    };
    return rolesMap[roleCode] || roleCode;
  }

  formatDateTime(isoStr: string): string {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  }

  private getDefaultFrom(): string {
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS_AGO);
    return d.toISOString().split('T')[0];
  }

  private getDefaultTo(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }
}
