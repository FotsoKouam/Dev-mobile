import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../api.config';
import {
  User,
  UserStats,
  CreateUserDto,
  UpdateUserDto,
  QueryUserParams,
  Page,
} from './models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private get baseUrl(): string {
    return this.config.apiUrl.replace(/\/+$/, '');
  }

  getUsers(params: QueryUserParams = {}): Observable<Page<User>> {
    let httpParams = new HttpParams();
    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit !== undefined && params.limit !== null) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.roleCode) {
      httpParams = httpParams.set('roleCode', params.roleCode);
    }
    if (params.schoolId) {
      httpParams = httpParams.set('schoolId', params.schoolId);
    }
    if (params.programId) {
      httpParams = httpParams.set('programId', params.programId);
    }

    return this.http.get<Page<User>>(`${this.baseUrl}/api/users`, {
      params: httpParams,
    });
  }

  getStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.baseUrl}/api/users/stats`);
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/api/users/${id}`);
  }

  createUser(dto: CreateUserDto): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/api/users`, dto);
  }

  updateUser(id: string, dto: UpdateUserDto): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/api/users/${id}`, dto);
  }

  updateUserStatus(id: string, status: 'active' | 'suspended' | 'inactive'): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/api/users/${id}`, { status });
  }

  getUserAssignments(userId: string): Observable<User['assignments']> {
    // Le endpoint GET /api/users/:id renvoie déjà { ...user, assignments: [...] }
    return new Observable((observer) => {
      this.getUser(userId).subscribe({
        next: (user) => {
          observer.next(user.assignments || []);
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }
}

