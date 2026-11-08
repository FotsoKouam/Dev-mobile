import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import {
  Role,
  RoleStats,
  Permission,
  CreateRoleDto,
  UpdateRoleDto,
  QueryRolesParams,
  Page,
} from './models/role.model';
import { User } from './models/user.model';

@Injectable({
  providedIn: 'root',
})
export class RolesApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get baseUrl(): string {
    return this.config.apiUrl.replace(/\/+$/, '');
  }

  getRoles(params: QueryRolesParams = {}): Observable<Page<Role>> {
    let httpParams = new HttpParams();
    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit !== undefined && params.limit !== null) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.type) {
      httpParams = httpParams.set('type', params.type);
    }

    return this.http.get<Page<Role>>(`${this.baseUrl}/api/roles`, {
      params: httpParams,
    });
  }

  getRole(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/api/roles/${id}`);
  }

  createRole(dto: CreateRoleDto): Observable<Role> {
    return this.http.post<Role>(`${this.baseUrl}/api/roles`, dto);
  }

  updateRole(id: string, dto: UpdateRoleDto): Observable<Role> {
    return this.http.patch<Role>(`${this.baseUrl}/api/roles/${id}`, dto);
  }

  updateRoleStatus(id: string, status: 'active' | 'inactive'): Observable<Role> {
    return this.http.patch<Role>(`${this.baseUrl}/api/roles/${id}`, { status });
  }

  // Si GET /api/roles/stats existe sur le backend
  getStats(): Observable<RoleStats> {
    return this.http.get<RoleStats>(`${this.baseUrl}/api/roles/stats`);
  }

  // Si GET /api/permissions existe sur le backend
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.baseUrl}/api/permissions`);
  }

  // Utilisateurs ayant ce rôle : GET /api/users?roleCode=...
  getUsersByRole(roleCode: string, limit: number = 5): Observable<Page<User>> {
    let httpParams = new HttpParams()
      .set('roleCode', roleCode)
      .set('limit', limit.toString())
      .set('page', '1');

    return this.http.get<Page<User>>(`${this.baseUrl}/api/users`, {
      params: httpParams,
    });
  }
}

