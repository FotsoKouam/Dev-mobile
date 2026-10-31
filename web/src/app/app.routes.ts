import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'schools',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'schools',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/schools/schools-placeholder.component').then(
        (m) => m.SchoolsPlaceholderComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
