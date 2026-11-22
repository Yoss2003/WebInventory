import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { EmployeeService } from '../../../core/services/employees';
import { Employee } from '../../../core/models/employee.model';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';

export interface WorkerPickerDialogData { excludeUserId?: number | null; employees?: Employee[]; }

@Component({
  selector: 'app-worker-picker-dialog', standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, UiButtonDirective, UiControlDirective, LoadingIndicatorComponent],
  templateUrl: './worker-picker-dialog.component.html',
  styleUrl: './worker-picker-dialog.component.scss'
})
export class WorkerPickerDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<WorkerPickerDialogComponent>);
  readonly data: WorkerPickerDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private readonly employeesApi = inject(EmployeeService);
  loading = false;
  refreshing = false;
  error = '';
  search = '';
  employees: Employee[] = [];

  get filteredEmployees(): Employee[] {
    const term = this.search.trim().toLowerCase();
    const visible = this.employees.filter(e => e.isActive && (!this.data.excludeUserId || e.userId !== this.data.excludeUserId));
    if (!term) return visible;
    return visible.filter(e => {
      const fullName = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
      const dni = (e.dni || '').toLowerCase();
      const username = (e.user?.username || '').toLowerCase();
      return fullName.includes(term) || dni.includes(term) || username.includes(term);
    });
  }

  ngOnInit(): void {
    if (this.data.employees?.length) this.employees = this.data.employees.filter(e => e.isActive);
    else this.load();
  }

  load(): void {
    const hasLoaded = this.employees.length > 0;
    this.loading = !hasLoaded;
    this.refreshing = hasLoaded;
    this.error = '';
    this.employeesApi.getEmployees().subscribe({
      next: rows => { this.employees = (rows || []).filter(e => e.isActive); this.loading = false; this.refreshing = false; },
      error: () => { this.loading = false; this.refreshing = false; this.error = 'No se pudieron consultar los colaboradores de la empresa.'; }
    });
  }

  refresh(): void { this.load(); }
  select(employee: Employee): void { this.dialogRef.close(employee); }
}
