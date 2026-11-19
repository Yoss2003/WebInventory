
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface MeasurementUnit {
  id: number;
  unitName: string;
  abbreviation: string;
}

@Injectable({ providedIn: 'root' })
export class MeasurementUnitsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/MeasurementUnits`;

  getAll(): Observable<MeasurementUnit[]> {
    return this.http.get<MeasurementUnit[]>(this.apiUrl);
  }
}