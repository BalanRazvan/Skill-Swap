import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(
        (m) => m.LandingComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/signup/signup.component').then(
        (m) => m.SignupComponent
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
  },
  {
    path: 'discover',
    loadComponent: () =>
      import('./features/discover/discover.component').then(
        (m) => m.DiscoverComponent
      ),
  },
  {
    path: 'swaps',
    loadComponent: () =>
      import('./features/swaps/swaps.component').then(
        (m) => m.SwapsComponent
      ),
  },
  {
    path: 'messages',
    loadComponent: () =>
      import('./features/messages/messages.component').then(
        (m) => m.MessagesComponent
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];
