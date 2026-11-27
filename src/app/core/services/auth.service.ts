import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoginRequest, AuthResponse } from '../models/auth.model';
import { Observable, catchError, finalize, of, shareReplay, tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { ApiCacheService } from './api-cache.service';

export type LoginApiResult = AuthResponse | {
  requirePasswordChange: true;
  passwordResetToken: string;
  expiresInMinutes: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cache = inject(ApiCacheService);
  private readonly apiUrl = `${API_URL}/Users`;
  private readonly companyPreference = 'inventory-last-company-id';
  private accessToken: string | null = null;
  private session: AuthResponse | null = null;
  private refreshInFlight: Observable<AuthResponse | null> | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('userSession');
    }
  }

  login(credentials: LoginRequest): Observable<LoginApiResult> {
    return this.http.post<LoginApiResult>(`${this.apiUrl}/Login`, credentials, {
      withCredentials: true,
      headers: new HttpHeaders({ 'X-OmniStock-Request': '1' })
    }).pipe(tap(result => {
      if (!('token' in result) || !result.token) return;
      if (Number(result.companyId) !== Number(credentials.companyId)) {
        throw new Error('La empresa de la sesión no coincide con la seleccionada. Acceso rechazado.');
      }
      this.setSession(result);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.companyPreference, String(credentials.companyId));
      }
    }));
  }

  private setSession(response: AuthResponse): void {
    this.session = { ...response };
    this.accessToken = response.token;
    this.cache.clearAll();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('userSession');
    }
  }

  restoreSession(): Observable<AuthResponse | null> {
    return this.refreshSession(false);
  }

  refreshSession(force = false): Observable<AuthResponse | null> {
    if (!force && this.accessToken && this.session) return of(this.session);
    if (this.refreshInFlight) return this.refreshInFlight;

    const request = this.http.post<AuthResponse>(`${this.apiUrl}/RefreshSession`, {}, {
      withCredentials: true,
      headers: new HttpHeaders({
        'X-OmniStock-Request': '1',
        'Cache-Control': 'no-store'
      })
    }).pipe(
      tap(response => this.setSession(response)),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
      finalize(() => { this.refreshInFlight = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.refreshInFlight = request;
    return request;
  }

  getSession(): AuthResponse | null { return this.session ? { ...this.session } : null; }
  getCacheScope(): string {
    return this.session
      ? 'company:' + this.session.companyId + '|user:' + this.session.id
      : 'anonymous';
  }

  requestPasswordRecovery(companyId: number, usernameOrEmail: string) {
    return this.http.post<{ message: string }>(
      `${API_URL}/password-recovery/request`, { companyId, usernameOrEmail });
  }

  completeInitialPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(
      `${API_URL}/password-recovery/complete`, { token, newPassword });
  }

  getLastSelectedCompanyId(): number | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const value = Number(localStorage.getItem(this.companyPreference));
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  getToken(): string | null { return this.accessToken; }

  clearSession(): void {
    this.accessToken = null;
    this.session = null;
    this.cache.clearAll();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('userSession');
    }
  }

  logout(): void {
    const request = this.http.post<void>(`${this.apiUrl}/Logout`, {}, {
      withCredentials: true,
      headers: new HttpHeaders({
        'X-OmniStock-Request': '1',
        'Cache-Control': 'no-store'
      })
    });
    this.clearSession();
    request.subscribe({ error: () => undefined });
  }
}
