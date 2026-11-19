import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee } from '../models/employee.model';
import { API_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/Employees`;

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.url);
  }

  getEmployee(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.url}/${id}`);
  }
}
