import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { InventorySummary } from './inventories';
import { AuthService } from './auth.service';

/** Inventario operativo elegido por el usuario; el maestro nunca es operativo. */
@Injectable({ providedIn: 'root' })
export class InventoryContextService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private readonly state = new BehaviorSubject<number | null>(null);
  private available: InventorySummary[] = [];
  readonly activeInventoryId$ = this.state.asObservable();

  get activeInventoryId(): number | null { return this.state.value; }
  get options(): InventorySummary[] { return [...this.available]; }

  private get key(): string {
    if (!isPlatformBrowser(this.platformId)) return 'inventory-active-unknown';
    const session = this.auth.getSession();
    return 'inventory-active-' + (session?.companyId ?? 0) + '-' + (session?.id ?? 0);
  }

  initialize(inventories: InventorySummary[], userId: number): void {
    this.available = (inventories || []).filter(i => i.isActive && !i.isMaster);
    const saved = isPlatformBrowser(this.platformId) ? Number(localStorage.getItem(this.key)) : 0;
    const candidate = this.available.find(i => i.id === saved)
      ?? this.available.find(i => i.userId === userId)
      ?? this.available[0];
    this.state.next(candidate?.id ?? null);
    if (candidate && isPlatformBrowser(this.platformId)) localStorage.setItem(this.key, String(candidate.id));
  }

  select(id: number): boolean {
    const found = this.available.some(i => i.id === id);
    if (!found) return false;
    this.state.next(id);
    if (isPlatformBrowser(this.platformId)) localStorage.setItem(this.key, String(id));
    return true;
  }
}
