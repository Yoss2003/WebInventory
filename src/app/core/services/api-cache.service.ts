import { HttpEvent, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, finalize, shareReplay, tap } from 'rxjs';

interface CacheEntry {
  expiresAt: number;
  response: HttpResponse<unknown>;
}

/** Caché GET en memoria, separada por ámbito de sesión e inventario activo. */
@Injectable({ providedIn: 'root' })
export class ApiCacheService {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Observable<HttpEvent<unknown>>>();
  private generation = 0;

  ttlFor(url: string): number {
    const path = url.toLowerCase();
    if (path.includes('/login') || path.includes('/refreshsession') || path.includes('/logout')) return 0;
    if (path.includes('/movements') || path.includes('/sales') || path.includes('/assignments')) return 20_000;
    if (path.includes('/users') || path.includes('/permissions') || path.includes('/roles')) return 30_000;
    if (path.includes('/articles') || path.includes('/inventories')) return 60_000;
    if (path.includes('/suppliers') || path.includes('/brands')) return 180_000;
    if (path.includes('/categories') || path.includes('/parameters') || path.includes('/measurementunits')) return 300_000;
    if (path.includes('/companies/active')) return 300_000;
    if (path.includes('/currencies') || path.includes('/languages') || path.includes('/timezones') || path.includes('/dateformats')) return 600_000;
    if (path.includes('/exchange-rates') || path.includes('/exchangerates')) return 120_000;
    return 0;
  }

  get(key: string): HttpResponse<unknown> | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) { this.entries.delete(key); return null; }
    return entry.response.clone();
  }

  set(key: string, response: HttpResponse<unknown>, ttl: number): void {
    if (ttl > 0 && response.status === 200) {
      this.entries.set(key, { response: response.clone(), expiresAt: Date.now() + ttl });
    }
  }

  /**
   * Coalesces simultaneous GETs for the same scoped key. The first request is
   * shared by all subscribers and its successful response becomes the cache.
   */
  coalesce<T extends HttpEvent<unknown>>(
    key: string,
    ttl: number,
    load: () => Observable<T>
  ): Observable<T> {
    const pending = this.inFlight.get(key);
    if (pending) return pending as Observable<T>;

    const generation = this.generation;
    let sharedRequest: Observable<T>;
    sharedRequest = load().pipe(
      tap(event => {
        if (generation === this.generation && event instanceof HttpResponse && event.status === 200) {
          this.set(key, event, ttl);
        }
      }),
      finalize(() => {
        if (this.inFlight.get(key) === sharedRequest) this.inFlight.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.inFlight.set(key, sharedRequest as Observable<HttpEvent<unknown>>);
    return sharedRequest;
  }

  clearAll(): void {
    this.generation++;
    this.entries.clear();
    this.inFlight.clear();
  }

  clearByPrefix(prefix: string): void {
    this.generation++;
    for (const key of this.entries.keys()) if (key.includes(prefix)) this.entries.delete(key);
    this.inFlight.clear();
  }
}
