import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Health check / test call to the root route of the backend.
   * Expects 'Hello World!' from Nest.js AppController.
   */
  getHello(): Observable<string> {
    return this.http.get(this.baseUrl, { responseType: 'text' });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
