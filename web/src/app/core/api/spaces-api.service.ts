import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import {
  Space,
  QuerySpacesParams,
  CreateSpaceDto,
  UpdateSpaceDto,
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
    if (params.programId) {
      httpParams = httpParams.set('programId', params.programId);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http.get<Page<Space>>(this.baseUrl, { params: httpParams });
  }

  getSpace(id: string): Observable<Space> {
    return this.http.get<Space>(`${this.baseUrl}/${id}`);
  }

  createSpace(programId: string, dto: CreateSpaceDto): Observable<Space> {
    // Le corps ne doit contenir ni type ni programId (rejet 400 par le backend)
    const payload: CreateSpaceDto = {
      name: dto.name.trim(),
    };
    if (dto.description !== undefined && dto.description !== null) {
      payload.description = dto.description.trim();
    }
    return this.http.post<Space>(`${this.config.apiUrl}/api/programs/${programId}/spaces`, payload);
  }

  updateSpace(id: string, dto: UpdateSpaceDto): Observable<Space> {
    return this.http.patch<Space>(`${this.baseUrl}/${id}`, dto);
  }

  // Helpers pour les filtres et listes déroulantes
  getSchools(limit = 100): Observable<Page<School>> {
    return this.http.get<Page<School>>(`${this.config.apiUrl}/api/schools`, {
      params: new HttpParams().set('limit', limit.toString()),
    });
  }

  getSchoolPrograms(schoolId: string): Observable<Page<Program>> {
    return this.http.get<Page<Program>>(`${this.config.apiUrl}/api/schools/${schoolId}/programs`);
  }

  // TODO: Route GET /api/documents/stats inexistante pour l'instant (backend Documents à venir).
  // Les 4 cartes affichent "—" sans appel réseau.
}

