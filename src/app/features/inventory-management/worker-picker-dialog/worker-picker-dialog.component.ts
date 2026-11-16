import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UiButtonDirective } from '../../../shared/ui/v2/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/v2/ui-control.directive';
import { EmployeeService } from '../../../core/services/employees';
import { Employee } from '../../../core/models/employee.model';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';

export interface WorkerPickerDialogData {
  excludeUserId?: number | null;
  employees?: Employee[];
}

@Component({
  selector: 'app-worker-picker-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatIconModule,
    UiButtonDirective, UiControlDirective, LoadingIndicatorComponent
  ],
  templateUrl: './worker-picker-dialog.component.html',
  styleUrl: './worker-picker-dialog.component.scss'
})
export class WorkerPickerDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<WorkerPickerDialogComponent>);
  readonly data: WorkerPickerDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private readonly employeesApi = inject(EmployeeService);

  loading = false;
  error = '';
  search = '';
  employees: Employee[] = [];

  get filteredEmployees(): Employee[] {
    const term = this.search.trim().toLowerCase();
    const visible = this.employees.filter(e => {
      if (!e.isActive) return false;
      if (this.data.excludeUserId && e.userId === this.data.excludeUserId) return false;
      return true;
    });

    if (!term) return visible;

    return visible.filter(e => {
      const full = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
      const dni = (e.dni || '').toLowerCase();
      const user = (e.user?.username || '').toLowerCase();
      const email = (e.user?.email || '').toLowerCase();
      return full.includes(term) || dni.includes(term) || user.includes(term) || email.includes(term);
    });
  }

  ngOnInit(): void {
    if (this.data.employees && this.data.employees.length > 0) {
      this.employees = this.data.employees;
    } else {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.employeesApi.getEmployees().subscribe({
      next: list => {
        this.employees = (list || []).filter(e => e.isActive);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron consultar los colaboradores de la empresa.';
      }
    });
  }

  getInitial(emp: Employee): string {
    const name = emp.firstName || emp.user?.username || 'C';
    return name.charAt(0).toUpperCase();
  }

  select(emp: Employee): void {
    this.dialogRef.close(emp);
  }
}
