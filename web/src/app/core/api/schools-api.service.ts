import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import {
  School,
  SchoolStats,
  Program,
  Page,
  QuerySchoolsParams,
  CreateSchoolDto,
  UpdateSchoolDto,
  QueryProgramsParams,
  CreateProgramDto,
  UpdateProgramDto,
} from './models/school.model';

@Injectable({
  providedIn: 'root',
})
export class SchoolsApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get baseUrl(): string {
    return this.config.apiUrl.replace(/\/+$/, '');
  }

  getSchools(params: QuerySchoolsParams = {}): Observable<Page<School>> {
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
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<Page<School>>(`${this.baseUrl}/api/schools`, {
      params: httpParams,
    });
  }

  getStats(): Observable<SchoolStats> {
    return this.http.get<SchoolStats>(`${this.baseUrl}/api/schools/stats`);
  }

  getSchool(id: string): Observable<School> {
    return this.http.get<School>(`${this.baseUrl}/api/schools/${id}`);
  }

  createSchool(dto: CreateSchoolDto): Observable<School> {
    return this.http.post<School>(`${this.baseUrl}/api/schools`, dto);
  }

  updateSchool(id: string, dto: UpdateSchoolDto): Observable<School> {
    return this.http.patch<School>(`${this.baseUrl}/api/schools/${id}`, dto);
  }

  getPrograms(schoolId: string, params: QueryProgramsParams = {}): Observable<Page<Program>> {
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

    return this.http.get<Page<Program>>(
      `${this.baseUrl}/api/schools/${schoolId}/programs`,
      { params: httpParams },
    );
  }

  createProgram(schoolId: string, dto: CreateProgramDto): Observable<Program> {
    return this.http.post<Program>(
      `${this.baseUrl}/api/schools/${schoolId}/programs`,
      dto,
    );
  }

  updateProgram(programId: string, dto: UpdateProgramDto): Observable<Program> {
    return this.http.patch<Program>(
      `${this.baseUrl}/api/programs/${programId}`,
      dto,
    );
  }
}

