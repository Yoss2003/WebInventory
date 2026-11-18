import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiButtonDirective } from '../../../shared/ui/v2/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/v2/ui-control.directive';
import { UiTableActionDirective } from '../../../shared/ui/v2/ui-table-action.directive';
import { InventoryService, InventorySummary, InventoryShare } from '../../../core/services/inventories';
import { ManagedUser } from '../../../core/services/user-management';
import { Employee } from '../../../core/models/employee.model';
import { WorkerPickerDialogComponent } from '../worker-picker-dialog/worker-picker-dialog.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmationDialogService } from '../../../shared/confirm-dialog/confirmation-dialog.service';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';

export interface ShareInventoryDialogData {
  inventory: InventorySummary;
  allInventories?: InventorySummary[];
  isManager?: boolean;
  users?: ManagedUser[];
  employees?: Employee[];
  selfId?: number;
}

@Component({
  selector: 'app-share-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    UiButtonDirective,
    UiControlDirective,
    UiTableActionDirective,
    LoadingIndicatorComponent
  ],
  templateUrl: './share-inventory-dialog.component.html',
  styleUrl: './share-inventory-dialog.component.scss'
})
export class ShareInventoryDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ShareInventoryDialogComponent>);
  readonly data: ShareInventoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialog);
  private readonly api = inject(InventoryService);
  private readonly toast = inject(ToastService);
  private readonly confirms = inject(ConfirmationDialogService);

  activeTab: 'wizard' | 'current' = 'wizard';
  currentStep = 1;

  // Paso 1: Inventario
  selectedInventoryId = this.data.inventory?.id || 0;

  get availableInventories(): InventorySummary[] {
    const list = this.data.allInventories && this.data.allInventories.length > 0
      ? this.data.allInventories
      : [this.data.inventory];
    return list.filter(i => i.isActive && !i.isMaster);
  }

  // Paso 2: Colaborador y Permiso
  selectedEmployee: Employee | null = null;
  guestIdentifier = '';
  accessLevel: 1 | 2 = 1;

  // Estado de guardado y carga
  submitting = false;
  error = '';

  // Lista de accesos actuales
  shares: InventoryShare[] = [];
  loadingShares = false;
  updatingShareId: number | null = null;

  get currentInventory(): InventorySummary {
    return this.availableInventories.find(i => i.id === this.selectedInventoryId) || this.data.inventory;
  }

  get isStep1Valid(): boolean {
    return !!this.selectedInventoryId;
  }

  get isStep2Valid(): boolean {
    return (!!this.selectedEmployee || this.guestIdentifier.trim().length > 0) && (this.accessLevel === 1 || this.accessLevel === 2);
  }

  get collaboratorDisplay(): string {
    if (this.selectedEmployee) {
      const full = `${this.selectedEmployee.firstName || ''} ${this.selectedEmployee.lastName || ''}`.trim();
      return full || this.selectedEmployee.user?.username || this.selectedEmployee.dni || 'Colaborador seleccionado';
    }
    return this.guestIdentifier.trim();
  }

  get collaboratorExtra(): string {
    if (this.selectedEmployee) {
      const parts: string[] = [];
      if (this.selectedEmployee.dni) parts.push(`DNI: ${this.selectedEmployee.dni}`);
      if (this.selectedEmployee.user?.username) parts.push(`Usuario: ${this.selectedEmployee.user.username}`);
      if (this.selectedEmployee.user?.email) parts.push(this.selectedEmployee.user.email);
      return parts.join(' · ');
    }
    return 'Identificador manual';
  }

  ngOnInit(): void {
    if (!this.selectedInventoryId && this.availableInventories.length > 0) {
      this.selectedInventoryId = this.availableInventories[0].id;
    }
    this.loadShares();
  }

  getOwnerName(userId: number): string {
    if (this.data.employees?.length) {
      const emp = this.data.employees.find(e => e.userId === userId);
      if (emp) {
        const full = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        if (full) return `${full} (${emp.user?.username || emp.dni || 'ID #' + userId})`;
      }
    }
    if (this.data.users?.length) {
      const user = this.data.users.find(u => u.id === userId);
      if (user) {
        const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return full ? `${full} (${user.username})` : user.username;
      }
    }
    return userId === this.data.selfId ? 'Mi cuenta' : `Usuario #${userId}`;
  }

  getShareEmail(userId: number): string | null {
    if (this.data.employees?.length) {
      const emp = this.data.employees.find(e => e.userId === userId);
      if (emp?.user?.email) return emp.user.email;
    }
    if (this.data.users?.length) {
      const user = this.data.users.find(u => u.id === userId);
      if (user?.email) return user.email;
    }
    return null;
  }

  loadShares(): void {
    if (!this.selectedInventoryId) return;
    this.loadingShares = true;
    this.api.getShares(this.selectedInventoryId).subscribe({
      next: res => {
        this.shares = res || [];
        this.loadingShares = false;
      },
      error: () => {
        this.loadingShares = false;
      }
    });
  }

  onInventoryChange(newId: number): void {
    this.selectedInventoryId = newId;
    this.loadShares();
  }

  toggleTab(): void {
    this.activeTab = this.activeTab === 'wizard' ? 'current' : 'wizard';
  }

  openWorkerPicker(): void {
    const pickerRef = this.dialog.open(WorkerPickerDialogComponent, {
      width: '780px',
      maxWidth: '96vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: {
        excludeUserId: this.currentInventory?.userId
      }
    });

    pickerRef.afterClosed().subscribe((selected: Employee | undefined) => {
      if (selected) {
        this.selectedEmployee = selected;
        this.guestIdentifier = selected.dni || selected.user?.username || selected.user?.email || selected.firstName || '';
      }
    });
  }

  clearSelectedEmployee(): void {
    this.selectedEmployee = null;
    this.guestIdentifier = '';
  }

  setStep(step: number): void {
    if (step === 2 && !this.isStep1Valid) return;
    if (step === 3 && (!this.isStep1Valid || !this.isStep2Valid)) return;
    this.currentStep = step;
  }

  submitShare(): void {
    if (!this.isStep2Valid || this.submitting) return;

    const identifier = (this.guestIdentifier || '').trim();
    if (!identifier) return;

    this.submitting = true;
    this.error = '';

    this.api.share(this.selectedInventoryId, identifier, this.accessLevel).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success(`Acceso concedido exitosamente a ${this.collaboratorDisplay}.`);
        this.clearSelectedEmployee();
        this.currentStep = 1;
        this.loadShares();
        this.activeTab = 'current';
      },
      error: err => {
        this.submitting = false;
        this.error = String(err?.error?.error || 'No se pudo compartir el inventario.');
      }
    });
  }

  changeShareAccess(item: InventoryShare): void {
    if (this.updatingShareId !== null) return;
    const nextAccess: 1 | 2 = item.accessLevel === 2 ? 1 : 2;
    const nextLabel = nextAccess === 2 ? 'Editor' : 'Solo Lector';

    this.confirms.confirm({
      title: 'Modificar nivel de permiso',
      message: `¿Cambiar el acceso de «${item.username || 'este usuario'}» a ${nextLabel}?`,
      confirmLabel: `Cambiar a ${nextLabel}`,
      tone: 'primary',
      icon: 'swap_horiz'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.updatingShareId = item.id;
      this.api.updateShareAccess(item.id, nextAccess).subscribe({
        next: () => {
          this.shares = this.shares.map(s => s.id === item.id ? { ...s, accessLevel: nextAccess } : s);
          this.updatingShareId = null;
          this.toast.success(`Permiso actualizado a ${nextLabel}.`);
        },
        error: e => {
          this.updatingShareId = null;
          this.toast.error(String(e?.error?.error || 'No se pudo actualizar el permiso.'));
        }
      });
    });
  }

  revokeShare(item: InventoryShare): void {
    this.confirms.confirm({
      title: 'Revocar acceso de inventario',
      message: `¿Revocar definitivamente el acceso a «${item.username || 'este usuario'}»? El inventario y su historial de movimientos no se verán afectados.`,
      confirmLabel: 'Sí, revocar acceso',
      tone: 'danger',
      icon: 'person_remove'
    }).subscribe(ok => {
      if (!ok) return;
      this.api.revoke(item.id).subscribe({
        next: () => {
          this.toast.success('Acceso revocado correctamente.');
          this.loadShares();
        },
        error: err => {
          this.toast.error(String(err?.error?.error || 'No se pudo revocar el acceso.'));
        }
      });
    });
  }
}
