import { InjectionToken } from '@angular/core';

// URLs relativas usam o proxy em desenvolvimento e a mesma origem em produção.
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '',
});
