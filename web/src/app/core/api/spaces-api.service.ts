import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import {
  Space,
  SpaceMember,
  QuerySpacesParams,
  CreateSpaceDto,
  UpdateSpaceDto,
  AddSpaceMemberDto,
} from './models/space.model';
import { Page, School, Program } from './models/school.model';

@Injectable({
  providedIn: 'root',
})
export class SpacesApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get baseUrl(): string {
    return `${this.config.apiUrl}/api/spaces`;
  }

  getSpaces(params: QuerySpacesParams = {}): Observable<Page<Space>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit !== undefined && params.limit !== null) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params.schoolId) {
      httpParams = httpParams.set('schoolId', params.schoolId);
    }
    if (params.scope) {
      httpParams = httpParams.set('scope', params.scope);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<Page<Space>>(this.baseUrl, { params: httpParams });
  }

  getSpace(id: string): Observable<Space> {
    return this.http.get<Space>(`${this.baseUrl}/${id}`);
  }

  createSpace(schoolId: string, dto: CreateSpaceDto): Observable<Space> {
    // Le corps ne doit contenir ni schoolId ni type
    const payload: CreateSpaceDto = {
      name: dto.name.trim(),
      scope: dto.scope,
    };
    if (dto.description !== undefined && dto.description !== null && dto.description.trim() !== '') {
      payload.description = dto.description.trim();
    }
    if (dto.scope === 'program' && dto.programId) {
      payload.programId = dto.programId;
    }
    if (dto.scope === 'role' && dto.roleCode) {
      payload.roleCode = dto.roleCode;
    }
    return this.http.post<Space>(`${this.config.apiUrl}/api/schools/${schoolId}/spaces`, payload);
  }

  updateSpace(id: string, dto: UpdateSpaceDto): Observable<Space> {
    return this.http.patch<Space>(`${this.baseUrl}/${id}`, dto);
  }

  getMembers(spaceId: string, page = 1, limit = 10): Observable<Page<SpaceMember>> {
    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<Page<SpaceMember>>(`${this.baseUrl}/${spaceId}/members`, { params: httpParams });
  }

  addMember(spaceId: string, userId: string): Observable<SpaceMember> {
    const payload: AddSpaceMemberDto = { userId };
    return this.http.post<SpaceMember>(`${this.baseUrl}/${spaceId}/members`, payload);
  }

  removeMember(spaceId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${spaceId}/members/${userId}`);
  }

  // Helpers pour les filtres et listes déroulantes
  getSchools(limit = 100): Observable<Page<School>> {
    return this.http.get<Page<School>>(`${this.config.apiUrl}/api/schools`, {
      params: new HttpParams().set('limit', limit.toString()).set('status', 'active'),
    });
  }

  getSchoolPrograms(schoolId: string, limit = 50): Observable<Page<Program>> {
    return this.http.get<Page<Program>>(`${this.config.apiUrl}/api/schools/${schoolId}/programs`, {
      params: new HttpParams().set('limit', limit.toString()).set('status', 'active'),
    });
  }
}
