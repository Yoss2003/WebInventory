import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

interface CacheEntry {
  expiresAt: number;
  response: HttpResponse<unknown>;
}

/** Caché GET en memoria, separada por ámbito de sesión e inventario activo. */
@Injectable({ providedIn: 'root' })
export class ApiCacheService {
  private readonly entries = new Map<string, CacheEntry>();

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
    if (ttl > 0 && response.status === 200) this.entries.set(key, { response: response.clone(), expiresAt: Date.now() + ttl });
  }

  clearAll(): void { this.entries.clear(); }
  clearByPrefix(prefix: string): void {
    for (const key of this.entries.keys()) if (key.includes(prefix)) this.entries.delete(key);
  }
}