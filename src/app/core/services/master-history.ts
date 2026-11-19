import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class MasterHistoryService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = API_URL;

  getInventories<T>(): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiRoot}/Inventories`);
  }

  getUsers<T>(): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiRoot}/Users`);
  }

  getHistory<T>(endpointPath: string, params: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.apiRoot}${endpointPath}`, { params });
  }
}