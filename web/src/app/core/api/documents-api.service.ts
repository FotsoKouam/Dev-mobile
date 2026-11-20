import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import { Page } from './models/school.model';
import {
  DocumentItem,
  DocumentStats,
  DocumentVersionItem,
  QueryDocumentsParams,
} from './models/document.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentsApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get baseUrl(): string {
    return `${this.config.apiUrl}/api/documents`;
  }

  getStats(schoolId?: string, programId?: string): Observable<DocumentStats> {
    let params = new HttpParams();
    if (schoolId) {
      params = params.set('schoolId', schoolId);
    }
    if (programId) {
      params = params.set('programId', programId);
    }
    return this.http.get<DocumentStats>(`${this.baseUrl}/stats`, { params });
  }

  getDocuments(queryParams: QueryDocumentsParams = {}): Observable<Page<DocumentItem>> {
    let params = new HttpParams();

    if (queryParams.page !== undefined && queryParams.page !== null) {
      params = params.set('page', queryParams.page.toString());
    }
    if (queryParams.limit !== undefined && queryParams.limit !== null) {
      params = params.set('limit', queryParams.limit.toString());
    }
    if (queryParams.spaceId) {
      params = params.set('spaceId', queryParams.spaceId);
    }
    if (queryParams.programId) {
      params = params.set('programId', queryParams.programId);
    }
    if (queryParams.schoolId) {
      params = params.set('schoolId', queryParams.schoolId);
    }
    if (queryParams.status) {
      params = params.set('status', queryParams.status);
    }
    if (queryParams.fileType) {
      params = params.set('fileType', queryParams.fileType);
    }
    if (queryParams.search && queryParams.search.trim()) {
      params = params.set('search', queryParams.search.trim());
    }

    return this.http.get<Page<DocumentItem>>(this.baseUrl, { params });
  }

  getDocument(id: string): Observable<DocumentItem> {
    return this.http.get<DocumentItem>(`${this.baseUrl}/${id}`);
  }

  uploadDocument(
    spaceId: string,
    file: File,
    name?: string,
  ): Observable<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    if (name && name.trim()) {
      formData.append('name', name.trim());
    }

    // Aucun en-tête Content-Type forcé pour laisser le navigateur poser le boundary multipart
    return this.http.post<DocumentItem>(
      `${this.config.apiUrl}/api/spaces/${spaceId}/documents`,
      formData,
    );
  }

  addDocumentVersion(documentId: string, file: File): Observable<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<DocumentItem>(
      `${this.baseUrl}/${documentId}/versions`,
      formData,
    );
  }

  getDocumentVersions(
    documentId: string,
    page: number = 1,
    limit: number = 10,
  ): Observable<Page<DocumentVersionItem>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<Page<DocumentVersionItem>>(
      `${this.baseUrl}/${documentId}/versions`,
      { params },
    );
  }

  downloadDocument(documentId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${documentId}/download`, {
      responseType: 'blob',
    });
  }

  downloadDocumentVersion(documentId: string, versionId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${documentId}/versions/${versionId}/download`, {
      responseType: 'blob',
    });
  }
}
