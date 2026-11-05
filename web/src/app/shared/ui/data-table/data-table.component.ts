import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageMeta } from '../../../core/api/models/school.model';

export interface ColumnDef<T = any> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  cell?: (item: T) => any;
  template?: TemplateRef<any>;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="data-table-container">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              @if (selectable) {
                <th class="checkbox-th">
                  <input
                    type="checkbox"
                    class="custom-checkbox"
                    [checked]="isAllSelected"
                    [indeterminate]="isPartiallySelected"
                    (change)="toggleSelectAll($event)"
                    aria-label="Sélectionner tous les éléments"
                  />
                </th>
              }
              @for (col of columns; track col.key) {
                <th [style.width]="col.width" [class.text-right]="col.align === 'right'" [class.text-center]="col.align === 'center'">
                  {{ col.header }}
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @if (loading) {
              @for (s of [1, 2, 3]; track s) {
                <tr class="skeleton-row">
                  @if (selectable) {
                    <td><div class="skeleton-cell" style="width: 18px;"></div></td>
                  }
                  @for (col of columns; track col.key) {
                    <td><div class="skeleton-cell"></div></td>
                  }
                </tr>
              }
            } @else if (!data || data.length === 0) {
              <tr>
                <td [attr.colspan]="columns.length + (selectable ? 1 : 0)" class="empty-cell">
                  <ng-content select="[emptyState]"></ng-content>
                  @if (!hasEmptyStateContent) {
                    <div class="default-empty">Aucune donnée disponible.</div>
                  }
                </td>
              </tr>
            } @else {
              @for (item of data; track trackByFn(item)) {
                <tr [class.clickable]="clickable" [class.row-selected]="isSelected(item)" (click)="onRowClick(item)">
                  @if (selectable) {
                    <td class="checkbox-td" (click)="$event.stopPropagation()">
                      <input
                        type="checkbox"
                        class="custom-checkbox"
                        [checked]="isSelected(item)"
                        (change)="toggleSelectItem(item, $event)"
                        aria-label="Sélectionner la ligne"
                      />
                    </td>
                  }
                  @for (col of columns; track col.key) {
                    <td [class.text-right]="col.align === 'right'" [class.text-center]="col.align === 'center'">
                      @if (col.template) {
                        <ng-container *ngTemplateOutlet="col.template; context: { $implicit: item }"></ng-container>
                      } @else if (col.cell) {
                        {{ col.cell(item) }}
                      } @else {
                        {{ item[col.key] }}
                      }
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (meta && meta.total > 0) {
        <div class="pagination-bar">
          <div class="pagination-info">
            {{ paginationSummary }}
          </div>
          <div class="pagination-actions">
            <button
              class="page-btn nav-btn"
              [disabled]="meta.page <= 1"
              (click)="goToPage(meta.page - 1)"
              aria-label="Page précédente"
            >
              Précédent
            </button>

            @for (p of pagesList; track p) {
              <button
                class="page-btn num-btn"
                [class.active]="p === meta.page"
                (click)="goToPage(p)"
              >
                {{ p }}
              </button>
            }

            <button
              class="page-btn nav-btn"
              [disabled]="meta.page >= totalPages"
              (click)="goToPage(meta.page + 1)"
              aria-label="Page suivante"
            >
              Suivant
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .data-table-container {
      background: #ffffff;
      border: 1px solid var(--color-border, #D9DFEA);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(27, 42, 74, 0.04);
    }
    .table-scroll {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    thead th {
      background: #F8FAFD;
      color: var(--color-text-muted, #7A8499);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--color-border, #D9DFEA);
    }
    tbody td {
      padding: 16px 18px;
      font-size: 14px;
      color: var(--color-text-dark, #1B2A4A);
      border-bottom: 1px solid #EEF2F8;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    tr.clickable {
      cursor: pointer;
      transition: background 0.15s ease;
    }
    tr.clickable:hover {
      background: #F6F9FD;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .checkbox-th, .checkbox-td {
      width: 44px;
      text-align: center;
      padding-left: 16px;
      padding-right: 8px;
    }
    .custom-checkbox {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1.5px solid var(--color-border, #D9DFEA);
      accent-color: var(--color-primary, #1B2A4A);
      cursor: pointer;
    }
    .row-selected {
      background: #F4F8FD !important;
    }
    .empty-cell {
      padding: 32px;
      text-align: center;
    }
    .default-empty {
      color: var(--color-text-muted, #7A8499);
    }
    .skeleton-cell {
      height: 18px;
      background: #E8EEF8;
      border-radius: 4px;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--color-border, #D9DFEA);
      background: #FFFFFF;
      font-size: 13px;
      color: var(--color-text-muted, #7A8499);
    }
    .pagination-actions {
      display: flex;
      gap: 6px;
    }
    .page-btn {
      height: 32px;
      padding: 0 10px;
      border: 1px solid var(--color-border, #D9DFEA);
      background: #FFFFFF;
      color: var(--color-text-dark, #1B2A4A);
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .page-btn:hover:not(:disabled) {
      border-color: var(--color-accent, #4A6FA5);
      color: var(--color-accent, #4A6FA5);
    }
    .page-btn.active {
      background: var(--color-primary, #1B2A4A);
      color: #ffffff;
      border-color: var(--color-primary, #1B2A4A);
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `],
})
export class DataTableComponent {
  @Input({ required: true }) columns: ColumnDef[] = [];
  @Input() data: any[] = [];
  @Input() meta?: PageMeta;
  @Input() loading = false;
  @Input() clickable = false;
  @Input() hasEmptyStateContent = false;
  @Input() trackBy: string = 'id';
  @Input() selectable = false;
  @Input() selectedItems: any[] = [];

  @Output() rowClick = new EventEmitter<any>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() selectionChange = new EventEmitter<any[]>();

  get isAllSelected(): boolean {
    if (!this.data || this.data.length === 0) return false;
    return this.data.every((item) => this.isSelected(item));
  }

  get isPartiallySelected(): boolean {
    if (!this.data || this.data.length === 0) return false;
    const selectedCount = this.data.filter((item) => this.isSelected(item)).length;
    return selectedCount > 0 && selectedCount < this.data.length;
  }

  isSelected(item: any): boolean {
    const id = this.trackByFn(item);
    return this.selectedItems.some((sel) => this.trackByFn(sel) === id);
  }

  toggleSelectItem(item: any, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const id = this.trackByFn(item);
    let updated: any[];
    if (checked) {
      updated = [...this.selectedItems, item];
    } else {
      updated = this.selectedItems.filter((sel) => this.trackByFn(sel) !== id);
    }
    this.selectedItems = updated;
    this.selectionChange.emit(updated);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    let updated: any[];
    if (checked) {
      // Add all current data items not yet selected
      const existingIds = new Set(this.selectedItems.map((s) => this.trackByFn(s)));
      const newItems = this.data.filter((item) => !existingIds.has(this.trackByFn(item)));
      updated = [...this.selectedItems, ...newItems];
    } else {
      const dataIds = new Set(this.data.map((d) => this.trackByFn(d)));
      updated = this.selectedItems.filter((s) => !dataIds.has(this.trackByFn(s)));
    }
    this.selectedItems = updated;
    this.selectionChange.emit(updated);
  }

  trackByFn(item: any): any {
    return item ? item[this.trackBy] ?? item : item;
  }

  onRowClick(item: any): void {
    if (this.clickable) {
      this.rowClick.emit(item);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.meta?.page) {
      this.pageChange.emit(page);
    }
  }

  get totalPages(): number {
    if (!this.meta || this.meta.limit <= 0) return 1;
    return Math.ceil(this.meta.total / this.meta.limit) || 1;
  }

  get pagesList(): number[] {
    const list: number[] = [];
    const max = this.totalPages;
    for (let i = 1; i <= max; i++) {
      list.push(i);
    }
    return list;
  }

  get paginationSummary(): string {
    if (!this.meta) return '';
    const start = (this.meta.page - 1) * this.meta.limit + 1;
    const end = Math.min(this.meta.page * this.meta.limit, this.meta.total);
    return `Affichage de ${start} à ${end} sur ${this.meta.total}`;
  }
}

