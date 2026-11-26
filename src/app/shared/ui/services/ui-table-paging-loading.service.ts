import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiTablePagingLoadingService {
  private readonly activeIds = new BehaviorSubject<ReadonlySet<string>>(new Set());
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  observe(tableId: string): Observable<boolean> {
    return this.activeIds.pipe(
      map(ids => ids.has(tableId)),
      distinctUntilChanged()
    );
  }

  flash(tableId: string | null | undefined, duration = 420): void {
    const id = String(tableId ?? '').trim();
    if (!id) return;

    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);

    this.update(id, true);
    const timer = setTimeout(() => {
      this.update(id, false);
      this.timers.delete(id);
    }, duration);
    this.timers.set(id, timer);
  }

  private update(id: string, active: boolean): void {
    const next = new Set(this.activeIds.value);
    if (active) next.add(id);
    else next.delete(id);
    this.activeIds.next(next);
  }
}
