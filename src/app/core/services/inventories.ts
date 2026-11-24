import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface InventorySummary {
  id: number;
  inventoryName: string;
  alias?: string | null;
  isActive: boolean;
  companyId: number;
  userId: number;
  isMaster: boolean;
}
export interface InventoryShareRecipient {
  userId: number;
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dni?: string | null;
  pictureUrl?: string | null;
}
export interface InventoryShare {
  id: number;
  inventoryId: number;
  userId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  accessLevel: number;
  sharedDate: string;
}
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/Inventories`;
  getInventories(): Observable<InventorySummary[]> {
    return this.http.get<InventorySummary[]>(this.url);
  }
  getMasters(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.url}/masters`);
  }
  getMasterCatalogs(masterId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.url}/masters/${masterId}/catalogs`);
  }
  companyInventories(): Observable<InventorySummary[]> {
    return this.http.get<InventorySummary[]>(`${this.url}/company-operational`);
  }
  create(name: string, alias: string | null): Observable<InventorySummary> {
    return this.http.post<InventorySummary>(this.url, { inventoryName: name, alias });
  }
  assign(ownerUserId: number, inventoryName: string, alias: string | null): Observable<InventorySummary> {
    return this.http.post<InventorySummary>(`${this.url}/assign`, {
      ownerUserId, inventoryName, alias
    });
  }
  update(item: InventorySummary, name: string, alias: string | null): Observable<void> {
    return this.http.put<void>(`${this.url}/${item.id}`, {
      id: item.id, inventoryName: name, alias
    });
  }
  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
  getShares(inventoryId: number): Observable<InventoryShare[]> {
    return this.http.get<InventoryShare[]>(`${this.url}/${inventoryId}/Shared`);
  }
  getShareRecipients(inventoryId: number): Observable<InventoryShareRecipient[]> {
    return this.http.get<InventoryShareRecipient[]>(`${this.url}/${inventoryId}/share-recipients`);
  }
  share(inventoryId: number, guestIdentifier: string, accessLevel: 1 | 2, guestUserId?: number | null): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.url}/Share`, {
      inventoryId, guestIdentifier, guestUserId: guestUserId ?? null, accessLevel
    });
  }
  updateShareAccess(shareId: number, accessLevel: 1 | 2): Observable<InventoryShare> {
    return this.http.put<InventoryShare>(`${this.url}/Share/${shareId}/Access`, { accessLevel });
  }
  revoke(shareId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/Revoke/${shareId}`);
  }
}
