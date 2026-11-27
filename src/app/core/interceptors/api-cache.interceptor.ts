import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';
import { ApiCacheService } from '../services/api-cache.service';
import { AuthService } from '../services/auth.service';
import { InventoryContextService } from '../services/inventory-context';

export const apiCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(ApiCacheService);
  const auth = inject(AuthService);
  const inventory = inject(InventoryContextService);
  const bypass = req.headers.has('X-Bypass-Api-Cache') || req.headers.get('Cache-Control') === 'no-cache';
  if (bypass) return next(req.clone({ headers: req.headers.delete('X-Bypass-Api-Cache') }));

  if (req.method === 'GET') {
    const ttl = cache.ttlFor(req.url);
    if (ttl > 0) {
      const scope = auth.getCacheScope();
      const inventoryId = inventory.activeInventoryId ?? 0;
      const key = scope + '|inventory:' + inventoryId + '|' + req.urlWithParams;
      const cached = cache.get(key);
      if (cached) return of(cached);
      return next(req).pipe(tap(event => {
        if (event instanceof HttpResponse && event.status === 200) cache.set(key, event, ttl);
      }));
    }
    return next(req);
  }

  return next(req).pipe(tap(event => {
    if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) cache.clearAll();
  }));
};