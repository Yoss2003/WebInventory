import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Movement } from '../models/movement.model';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class MovementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/Movements`;

  getMovements(): Observable<Movement[]> { return this.http.get<Movement[]>(this.apiUrl); }
  createMovement(movement: Partial<Movement>): Observable<Movement> { return this.http.post<Movement>(this.apiUrl, movement); }
  getCancellations(): Observable<Array<{originalMovementId:number;reversalMovementId:number}>> {
    return this.http.get<Array<{originalMovementId:number;reversalMovementId:number}>>(`${this.apiUrl}/cancellations`);
  }
  cancelMovement(id: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/cancel`, { reason });
  }
}
