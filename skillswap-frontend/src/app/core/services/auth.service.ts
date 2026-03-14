import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, switchMap, map, timer, retry } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile } from '../models/profile.model';
import {
  AuthResponse,
  AuthSession,
  LoginRequest,
  SignupRequest,
} from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly AUTH_URL = `${environment.apiUrl}/auth`;
  private readonly PROFILES_URL = `${environment.apiUrl}/profiles`;

  private readonly currentUserSignal = signal<Profile | null>(null);
  private readonly isLoadingSignal = signal(true);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly isLoading = this.isLoadingSignal.asReadonly();

  constructor() {
    this.initializeAuth();
  }

  login(request: LoginRequest): Observable<Profile> {
    return this.http
      .post<AuthResponse>(`${this.AUTH_URL}/login`, request)
      .pipe(
        tap((response) => this.storeTokens(response.session)),
        switchMap((response) => this.fetchProfile(response.user.id, response.user.email)),
      );
  }

  signup(request: SignupRequest): Observable<Profile> {
    return this.http
      .post<AuthResponse>(`${this.AUTH_URL}/signup`, request)
      .pipe(
        tap((response) => this.storeTokens(response.session)),
        switchMap((response) => this.fetchProfile(response.user.id, response.user.email)),
      );
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** Reload the current user profile from the server */
  refreshProfile(): void {
    const user = this.currentUserSignal();
    if (user) {
      this.fetchProfile(user.id, user.email ?? '').subscribe();
    }
  }

  private initializeAuth(): void {
    const token = this.getAccessToken();

    if (!token) {
      this.isLoadingSignal.set(false);
      return;
    }

    // Use /auth/me for initial load (we need the user ID)
    // Retry with delay to handle clock skew on fresh tokens
    this.http.get<Profile>(`${this.AUTH_URL}/me`).pipe(
      retry({ count: 2, delay: () => timer(2000) }),
    ).subscribe({
      next: (profile) => {
        this.currentUserSignal.set(profile);
        this.isLoadingSignal.set(false);
      },
      error: () => {
        this.clearTokens();
        this.isLoadingSignal.set(false);
      },
    });
  }

  /**
   * Fetch profile via public endpoint (no auth needed).
   * Avoids clock-skew issues with freshly issued JWT tokens.
   */
  private fetchProfile(userId: string, email: string): Observable<Profile> {
    return this.http.get<Profile>(`${this.PROFILES_URL}/${userId}`).pipe(
      map((profile) => ({ ...profile, email })),
      tap((profile) => this.currentUserSignal.set(profile)),
    );
  }

  private storeTokens(session: AuthSession): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUserSignal.set(null);
  }
}
