import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { InventoryService, InventorySummary } from '../../../core/services/inventories';
import { ManagedUser } from '../../../core/services/user-management';
import { Employee } from '../../../core/models/employee.model';
import { WorkerPickerDialogComponent } from '../worker-picker-dialog/worker-picker-dialog.component';
import { InventorySharesDialogComponent } from '../inventory-shares-dialog/inventory-shares-dialog.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';

export interface ShareInventoryDialogData {
  inventory: InventorySummary;
  isManager?: boolean;
  users?: ManagedUser[];
  employees?: Employee[];
  selfId?: number;
}

@Component({
  selector: 'app-share-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatIconModule,
    MatAutocompleteModule, MatTooltipModule, UiButtonDirective,
    UiControlDirective, LoadingIndicatorComponent
  ],
  templateUrl: './share-inventory-dialog.component.html',
  styleUrl: './share-inventory-dialog.component.scss'
})
export class ShareInventoryDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ShareInventoryDialogComponent>);
  readonly data: ShareInventoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(InventoryService);
  private readonly toast = inject(ToastService);

  currentStep = 1;
  readonly selectedInventoryId = this.data.inventory?.id || 0;
  employeeInput: string | Employee = '';
  selectedEmployee: Employee | null = null;
  guestIdentifier = '';
  accessLevel: 1 | 2 = 1;
  submitting = false;
  error = '';

  get currentInventory(): InventorySummary { return this.data.inventory; }

  get filteredEmployees(): Employee[] {
    const term = typeof this.employeeInput === 'string' ? this.employeeInput.trim().toLowerCase() : '';
    const active = (this.data.employees || []).filter(e => e.isActive && e.userId !== this.currentInventory.userId);
    if (!term) return active;
    return active.filter(e =>
      `${e.firstName || ''} ${e.lastName || ''} ${e.dni || ''} ${e.user?.username || ''}`.toLowerCase().includes(term)
    );
  }

  displayEmployee = (employee: Employee | string | null): string =>
    typeof employee === 'string' ? employee : employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : '';

  get isStep1Valid(): boolean {
    return !!this.selectedEmployee && !!this.guestIdentifier.trim() && (this.accessLevel === 1 || this.accessLevel === 2);
  }

  get collaboratorDisplay(): string {
    if (!this.selectedEmployee) return '';
    const full = `${this.selectedEmployee.firstName || ''} ${this.selectedEmployee.lastName || ''}`.trim();
    return full || this.selectedEmployee.user?.username || this.selectedEmployee.dni || 'Colaborador seleccionado';
  }

  get collaboratorExtra(): string {
    if (!this.selectedEmployee) return '';
    const parts: string[] = [];
    if (this.selectedEmployee.dni) parts.push(`DNI: ${this.selectedEmployee.dni}`);
    if (this.selectedEmployee.user?.username) parts.push(`Usuario: ${this.selectedEmployee.user.username}`);
    if (this.selectedEmployee.user?.email) parts.push(this.selectedEmployee.user.email);
    return parts.join(' · ');
  }

  getOwnerName(userId: number): string {
    const employee = this.data.employees?.find(e => e.userId === userId);
    if (employee) {
      const full = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      if (full) return full;
    }
    const user = this.data.users?.find(u => u.id === userId);
    if (user) {
      const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return full ? `${full} (${user.username})` : user.username;
    }
    return userId === this.data.selfId ? 'Mi cuenta' : `Usuario #${userId}`;
  }

  onEmployeeInputChange(value: string | Employee): void {
    if (typeof value === 'string') {
      this.selectedEmployee = null;
      this.guestIdentifier = '';
    }
  }

  selectEmployee(employee: Employee | null): void {
    if (!employee) return;
    this.selectedEmployee = employee;
    this.employeeInput = employee;
    this.guestIdentifier = employee.dni || employee.user?.username || employee.user?.email || '';
    this.error = '';
  }

  openWorkerPicker(): void {
    const pickerRef = this.dialog.open(WorkerPickerDialogComponent, {
      width: '780px', maxWidth: '96vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: { excludeUserId: this.currentInventory.userId }
    });
    pickerRef.afterClosed().subscribe((selected: Employee | undefined) => {
      if (selected) this.selectEmployee(selected);
    });
  }

  clearSelectedEmployee(): void {
    this.selectedEmployee = null;
    this.employeeInput = '';
    this.guestIdentifier = '';
  }

  openSharesDialog(): void {
    this.dialog.open(InventorySharesDialogComponent, {
      width: '760px', maxWidth: '96vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: { inventory: this.currentInventory, employees: this.data.employees, users: this.data.users, selfId: this.data.selfId }
    });
  }

  setStep(step: number): void {
    if (step === 2 && !this.isStep1Valid) return;
    this.currentStep = step;
    this.error = '';
  }

  submitShare(): void {
    if (!this.isStep1Valid || this.submitting) return;
    this.submitting = true;
    this.error = '';
    this.api.share(this.selectedInventoryId, this.guestIdentifier.trim(), this.accessLevel).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success(`Acceso concedido exitosamente a ${this.collaboratorDisplay}.`);
        this.dialogRef.close(true);
      },
      error: err => {
        this.submitting = false;
        this.error = String(err?.error?.error || 'No se pudo compartir el inventario.');
      }
    });
  }
}
