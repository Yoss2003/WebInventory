import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class MasterCatalogsService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = API_URL;

  getSuppliers<T>(): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiRoot}/Suppliers`);
  }

  lookupSupplierByRuc<T>(ruc: string): Observable<T> {
    return this.http.get<T>(`${this.apiRoot}/Suppliers/ruc/${encodeURIComponent(ruc)}`);
  }

  saveSupplier<T>(payload: unknown, id?: number | null): Observable<T> {
    return id
      ? this.http.put<T>(`${this.apiRoot}/Suppliers/${id}`, payload)
      : this.http.post<T>(`${this.apiRoot}/Suppliers`, payload);
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiRoot}/Suppliers/${id}`);
  }

  getParameters<T>(): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiRoot}/Parameters`);
  }

  saveParameter<T>(payload: unknown, id?: number | null): Observable<T> {
    return id
      ? this.http.put<T>(`${this.apiRoot}/Parameters/${id}`, payload)
      : this.http.post<T>(`${this.apiRoot}/Parameters`, payload);
  }

  deleteParameter(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiRoot}/Parameters/${id}`);
  }
}