import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ApiConfig {
  apiUrl: string;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    apiUrl: environment.apiUrl,
  }),
});
