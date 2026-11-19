import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, AuthResponse } from '../models/auth.model';
import { tap } from 'rxjs';
import { API_URL } from '../config/api.config';

/** La API puede pedir cambio inicial de contraseña en lugar de emitir un token. */
export type LoginApiResult = AuthResponse | {
  requirePasswordChange: true;
  passwordResetToken: string;
  expiresInMinutes: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${API_URL}/Users`;
  private readonly companyPreference = 'inventory-last-company-id';

  login(credentials: LoginRequest) {
    return this.http.post<LoginApiResult>(`${this.apiUrl}/Login`, credentials).pipe(
      tap(result => {
        if (!('token' in result) || !result.token) return;
        if (Number(result.companyId) !== Number(credentials.companyId)) {
          throw new Error('La empresa de la sesión no coincide con la seleccionada. Acceso rechazado.');
        }
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', result.token);
          localStorage.setItem('userSession', JSON.stringify(result));
          localStorage.setItem(this.companyPreference, String(credentials.companyId));
        }
      })
    );
  }

  /** Completa el cambio inicial con el reto temporal emitido tras verificar la clave de bienvenida. */
  requestPasswordRecovery(companyId: number, usernameOrEmail: string) {
    return this.http.post<{ message: string }>(
      `${API_URL}/password-recovery/request`,
      { companyId, usernameOrEmail }
    );
  }

  completeInitialPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(
      `${API_URL}/password-recovery/complete`,
      { token, newPassword }
    );
  }

  getLastSelectedCompanyId(): number | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const value = Number(localStorage.getItem(this.companyPreference));
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('token');
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem('token');
    localStorage.removeItem('userSession');
  }
}
