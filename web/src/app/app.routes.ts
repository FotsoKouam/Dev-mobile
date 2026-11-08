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
      import('./features/schools/schools.component').then(
        (m) => m.SchoolsComponent,
      ),
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/users/users.component').then(
        (m) => m.UsersComponent,
      ),
  },
  {
    path: 'roles',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/roles/roles.component').then(
        (m) => m.RolesComponent,
      ),
  },
  {
    path: 'assignments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/assignments/assignments.component').then(
        (m) => m.AssignmentsComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
