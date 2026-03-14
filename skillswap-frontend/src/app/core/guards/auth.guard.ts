import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Auth state already resolved — decide immediately
  if (!authService.isLoading()) {
    if (authService.isAuthenticated()) return true;
    return router.createUrlTree(['/login']);
  }

  // Still loading — wait for the initial /me call to finish
  return toObservable(authService.isLoading).pipe(
    filter((isLoading) => !isLoading),
    map(() => {
      if (authService.isAuthenticated()) return true;
      return router.createUrlTree(['/login']);
    }),
    take(1),
  );
};
