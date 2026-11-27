import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const path = req.url.toLowerCase();
  const isSessionEndpoint = path.includes('/api/users/login') ||
    path.includes('/api/users/refreshsession') ||
    path.includes('/api/users/logout');
  const request = req.clone({ withCredentials: true });

  if (isSessionEndpoint || path.includes('/api/companies/active')) return next(request);

  const token = auth.getToken();
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(catchError((error: unknown) => {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !token) {
      return throwError(() => error);
    }
    return auth.refreshSession(true).pipe(
      switchMap(session => {
        if (!session?.token) {
          auth.clearSession();
          return throwError(() => error);
        }
        return next(request.clone({
          setHeaders: { Authorization: `Bearer ${session.token}` }
        }));
      }),
      catchError(refreshError => {
        auth.clearSession();
        return throwError(() => refreshError);
      })
    );
  }));
};
