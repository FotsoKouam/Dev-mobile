import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import { Page } from './models/school.model';
import {
  AuditLogItem,
  AuditStats,
  QueryAuditLogsParams,
  QueryAuditStatsParams,
} from './models/audit.model';

@Injectable({
  providedIn: 'root',
})
export class AuditApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get baseUrl(): string {
    return `${this.config.apiUrl}/api/audit-logs`;
  }

  getStats(params: QueryAuditStatsParams = {}): Observable<AuditStats> {
    let httpParams = new HttpParams();
    if (params.from) {
      httpParams = httpParams.set('from', params.from);
    }
    if (params.to) {
      httpParams = httpParams.set('to', params.to);
    }
    return this.http.get<AuditStats>(`${this.baseUrl}/stats`, { params: httpParams });
  }

  getAuditLogs(queryParams: QueryAuditLogsParams = {}): Observable<Page<AuditLogItem>> {
    let params = new HttpParams();

    if (queryParams.page !== undefined && queryParams.page !== null) {
      params = params.set('page', queryParams.page.toString());
    }
    if (queryParams.limit !== undefined && queryParams.limit !== null) {
      params = params.set('limit', queryParams.limit.toString());
    }
    if (queryParams.from) {
      params = params.set('from', queryParams.from);
    }
    if (queryParams.to) {
      params = params.set('to', queryParams.to);
    }
    if (queryParams.action) {
      params = params.set('action', queryParams.action);
    }
    if (queryParams.result) {
      params = params.set('result', queryParams.result);
    }
    if (queryParams.target) {
      params = params.set('target', queryParams.target);
    }
    if (queryParams.userId) {
      params = params.set('userId', queryParams.userId);
    }
    if (queryParams.search && queryParams.search.trim()) {
      params = params.set('search', queryParams.search.trim());
    }

    return this.http.get<Page<AuditLogItem>>(this.baseUrl, { params });
  }

  getAuditLog(id: string): Observable<AuditLogItem> {
    return this.http.get<AuditLogItem>(`${this.baseUrl}/${id}`);
  }
}
