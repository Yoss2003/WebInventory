import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ModalStandardService } from '../../../shared/ui/services/modal-standard.service';
import { MatIconModule } from '@angular/material/icon';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { InventoryDialogMotionDirective } from '../../../shared/ui/directives/inv-dialog-motion.directive';
import { InventoryService, InventorySummary, InventoryShareRecipient } from '../../../core/services/inventories';
import { ManagedUser } from '../../../core/services/user-management';
import { InventorySharesDialogComponent } from '../inventory-shares-dialog/inventory-shares-dialog.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';
import { timeout } from 'rxjs';
import type { ModalActionId, ModalFooterAction, ModalSection } from '../../../shared/ui/models/modal-standard.model';

export interface ShareInventoryDialogData {
  inventory: InventorySummary;
  isManager?: boolean;
  users?: ManagedUser[];
  selfId?: number;
}

@Component({
  selector: 'app-share-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, InventoryDialogMotionDirective,
    UiButtonDirective, UiControlDirective, ModalShellComponent, LoadingIndicatorComponent
  ],
  templateUrl: './share-inventory-dialog.component.html',
  styleUrl: './share-inventory-dialog.component.scss'
})
export class ShareInventoryDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ShareInventoryDialogComponent>);
  readonly data: ShareInventoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly modalStandards = inject(ModalStandardService);
  private readonly api = inject(InventoryService);
  private readonly toast = inject(ToastService);

  currentStep = 1;
  readonly selectedInventoryId = this.data.inventory?.id || 0;
  employeeSearch = '';
  selectedEmployee: InventoryShareRecipient | null = null;
  employees: InventoryShareRecipient[] = [];
  loadingRecipients = false;
  recipientError = '';
  accessLevel: 1 | 2 = 1;
  submitting = false;
  error = '';

  ngOnInit(): void { this.loadRecipients(); }

  get currentInventory(): InventorySummary { return this.data.inventory; }

  get filteredEmployees(): InventoryShareRecipient[] {
    const term = this.employeeSearch.trim().toLowerCase();
    return this.employees.filter(employee => {
      const text = [
        employee.firstName || '', employee.lastName || '', employee.dni || '',
        employee.username || '', employee.email || ''
      ].join(' ').toLowerCase();
      return !term || text.includes(term);
    });
  }

  displayEmployee(employee: InventoryShareRecipient): string {
    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    return fullName || employee.username || employee.email || `Usuario #${employee.userId}`;
  }

  get isStep1Valid(): boolean {
    return !!this.selectedEmployee && this.selectedEmployee.userId > 0 &&
      (this.accessLevel === 1 || this.accessLevel === 2);
  }

  get collaboratorDisplay(): string {
    return this.selectedEmployee ? this.displayEmployee(this.selectedEmployee) : '';
  }

  get collaboratorExtra(): string {
    if (!this.selectedEmployee) return '';
    return [
      this.selectedEmployee.dni ? `DNI: ${this.selectedEmployee.dni}` : '',
      this.selectedEmployee.username ? `Usuario: ${this.selectedEmployee.username}` : '',
      this.selectedEmployee.email || ''
    ].filter(Boolean).join(' · ');
  }

  getOwnerName(userId: number): string {
    const user = this.data.users?.find(item => item.id === userId);
    if (user) {
      const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return full ? `${full} (${user.username})` : user.username;
    }
    return userId === this.data.selfId ? 'Mi cuenta' : `Usuario #${userId}`;
  }

  loadRecipients(): void {
    if (!this.selectedInventoryId) {
      this.recipientError = 'No se identificó el inventario que se desea compartir.';
      return;
    }
    this.loadingRecipients = true;
    this.recipientError = '';
    this.api.getShareRecipients(this.selectedInventoryId).pipe(
      timeout({ first: 15000 })
    ).subscribe({
      next: rows => {
        this.employees = (rows || []).filter(item => item.userId > 0);
        this.loadingRecipients = false;
      },
      error: err => {
        this.loadingRecipients = false;
        this.recipientError = err?.name === 'TimeoutError'
          ? 'La consulta de empleados tardó demasiado. Puedes volver a intentarlo.'
          : String(err?.error?.error || 'No se pudieron consultar los empleados disponibles para compartir.');
      }
    });
  }

  onEmployeeSearchChange(value: string): void {
    if (this.selectedEmployee && value.trim() !== this.displayEmployee(this.selectedEmployee)) {
      this.selectedEmployee = null;
    }
  }

  selectEmployee(employee: InventoryShareRecipient): void {
    if (!employee?.userId) return;
    this.selectedEmployee = employee;
    this.employeeSearch = this.displayEmployee(employee);
    this.error = '';
  }

  openSharesDialog(): void {
    this.modalStandards.open(InventorySharesDialogComponent, 'detail', {
      width: '760px', maxWidth: '96vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: { inventory: this.currentInventory, users: this.data.users, selfId: this.data.selfId }
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
      case 'previous': this.setStep(1); break;
      case 'cancel':
      case 'close': this.close(); break;
      case 'next': this.setStep(2); break;
      case 'primary': this.submitShare(); break;
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
    const guestUserId = this.selectedEmployee?.userId;
    if (!this.isStep1Valid || !guestUserId || this.submitting) return;
    this.submitting = true;
    this.error = '';
    this.api.share(this.selectedInventoryId, '', this.accessLevel, guestUserId).subscribe({
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
