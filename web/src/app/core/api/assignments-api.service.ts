import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import {
  Assignment,
  AssignmentStats,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  QueryAssignmentsParams,
  Page,
} from './models/assignment.model';
import { School, Program } from './models/school.model';
import { User } from './models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AssignmentsApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get baseUrl(): string {
    return `${this.config.apiUrl}/api/assignments`;
  }

  getAssignments(params: QueryAssignmentsParams = {}): Observable<Page<Assignment>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.schoolId) {
      httpParams = httpParams.set('schoolId', params.schoolId);
    }
    if (params.programId) {
      httpParams = httpParams.set('programId', params.programId);
    }
    if (params.roleCode) {
      httpParams = httpParams.set('roleCode', params.roleCode);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<Page<Assignment>>(this.baseUrl, { params: httpParams });
  }

  getAssignment(id: string): Observable<Assignment> {
    return this.http.get<Assignment>(`${this.baseUrl}/${id}`);
  }

  createAssignment(dto: CreateAssignmentDto): Observable<Assignment> {
    return this.http.post<Assignment>(this.baseUrl, dto);
  }

  updateAssignment(id: string, dto: UpdateAssignmentDto): Observable<Assignment> {
    return this.http.patch<Assignment>(`${this.baseUrl}/${id}`, dto);
  }

  deactivateAssignment(id: string): Observable<Assignment> {
    return this.http.patch<Assignment>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  getStats(): Observable<AssignmentStats> {
    return this.http.get<AssignmentStats>(`${this.baseUrl}/stats`);
  }

  // Helpers pour formulaire & filtres
  getSchools(limit = 100): Observable<Page<School>> {
    return this.http.get<Page<School>>(`${this.config.apiUrl}/api/schools`, {
      params: new HttpParams().set('limit', limit.toString()),
    });
  }

  getSchoolPrograms(schoolId: string): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.config.apiUrl}/api/schools/${schoolId}/programs`);
  }

  searchUsers(search = '', limit = 20): Observable<Page<User>> {
    let params = new HttpParams().set('limit', limit.toString());
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Page<User>>(`${this.config.apiUrl}/api/users`, { params });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.config.apiUrl}/api/users/${id}`);
  }
}

