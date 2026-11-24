import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { ModalStandardService } from '../../../shared/ui/services/modal-standard.service';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { InventoryDialogMotionDirective } from '../../../shared/ui/directives/inv-dialog-motion.directive';
import { InventoryService, InventorySummary } from '../../../core/services/inventories';
import { ManagedUser } from '../../../core/services/user-management';
import { Employee } from '../../../core/models/employee.model';
import { WorkerPickerDialogComponent } from '../worker-picker-dialog/worker-picker-dialog.component';
import { InventorySharesDialogComponent } from '../inventory-shares-dialog/inventory-shares-dialog.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import type { ModalActionId, ModalFooterAction, ModalSection } from '../../../shared/ui/models/modal-standard.model';

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
    CommonModule, FormsModule, MatIconModule,
    MatAutocompleteModule, InventoryDialogMotionDirective,
    UiButtonDirective, UiControlDirective, ModalShellComponent
  ],
  templateUrl: './share-inventory-dialog.component.html',
  styleUrl: './share-inventory-dialog.component.scss'
})
export class ShareInventoryDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ShareInventoryDialogComponent>);
  readonly data: ShareInventoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialog);
  private readonly modalStandards = inject(ModalStandardService);
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
    const pickerRef = this.modalStandards.open(WorkerPickerDialogComponent, 'selector', {
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
    this.modalStandards.open(InventorySharesDialogComponent, 'detail', {
      width: '760px', maxWidth: '96vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: { inventory: this.currentInventory, employees: this.data.employees, users: this.data.users, selfId: this.data.selfId }
    });
  }

  get modalSections(): ModalSection[] {
    return [
      { id: 'access', label: 'Acceso y permisos', completed: this.currentStep > 1 && this.isStep1Valid },
      { id: 'summary', label: 'Resumen', disabled: this.submitting || !this.isStep1Valid }
    ];
  }

  get modalFooterActions(): ModalFooterAction[] {
    const actions: ModalFooterAction[] = [];
    if (this.currentStep > 1) {
      actions.push({ id: 'previous', label: 'Anterior', tone: 'secondary', icon: 'arrow_back', order: 0, disabled: this.submitting });
    }
    actions.push({ id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 1, disabled: this.submitting });
    if (this.currentStep === 1) {
      actions.push({ id: 'next', label: 'Siguiente: Resumen', tone: 'primary', icon: 'arrow_forward', order: 2, disabled: !this.isStep1Valid || this.submitting });
    } else {
      actions.push({ id: 'primary', label: 'Conceder acceso', tone: 'primary', icon: 'group_add', order: 2, disabled: !this.isStep1Valid || this.submitting });
    }
    return actions;
  }

  handleModalAction(action: ModalActionId): void {
    switch (action) {
      case 'previous':
        this.setStep(1);
        break;
      case 'cancel':
      case 'close':
        this.close();
        break;
      case 'next':
        this.setStep(2);
        break;
      case 'primary':
        this.submitShare();
        break;
    }
  }

  close(): void {
    if (!this.submitting) this.dialogRef.close();
  }

  setStep(step: number): void {
    if (this.submitting || step < 1 || step > 2 || (step === 2 && !this.isStep1Valid)) return;
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
