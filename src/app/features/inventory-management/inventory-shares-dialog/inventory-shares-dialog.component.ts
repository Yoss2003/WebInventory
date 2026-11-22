import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService, InventorySummary, InventoryShare } from '../../../core/services/inventories';
import { Employee } from '../../../core/models/employee.model';
import { ManagedUser } from '../../../core/services/user-management';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmationDialogService } from '../../../shared/confirm-dialog/confirmation-dialog.service';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiTableActionDirective } from '../../../shared/ui/directives/ui-table-action.directive';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';

export interface InventorySharesDialogData {
  inventory: InventorySummary;
  employees?: Employee[];
  users?: ManagedUser[];
  selfId?: number;
}

@Component({
  selector: 'app-inventory-shares-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, UiButtonDirective, UiTableActionDirective, LoadingIndicatorComponent],
  templateUrl: './inventory-shares-dialog.component.html',
  styleUrl: './inventory-shares-dialog.component.scss'
})
export class InventorySharesDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<InventorySharesDialogComponent>);
  readonly data: InventorySharesDialogData = inject(MAT_DIALOG_DATA);
  private readonly api = inject(InventoryService);
  private readonly toast = inject(ToastService);
  private readonly confirms = inject(ConfirmationDialogService);

  shares: InventoryShare[] = [];
  loading = true;
  refreshing = false;
  error = '';
  updatingShareId: number | null = null;

  ngOnInit(): void { this.load(); }

  getOwnerName(userId: number): string {
    const employee = this.data.employees?.find(e => e.userId === userId);
    if (employee) {
      const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      if (name) return name;
    }
    const user = this.data.users?.find(u => u.id === userId);
    if (user) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return name || user.username;
    }
    return userId === this.data.selfId ? 'Mi cuenta' : `Usuario #${userId}`;
  }

  getEmail(userId: number): string | null {
    const employee = this.data.employees?.find(e => e.userId === userId);
    if (employee?.user?.email) return employee.user.email;
    return this.data.users?.find(u => u.id === userId)?.email || null;
  }

  load(): void {
    const hasData = this.shares.length > 0;
    this.loading = !hasData;
    this.refreshing = hasData;
    this.error = '';
    this.api.getShares(this.data.inventory.id).subscribe({
      next: rows => { this.shares = rows || []; this.loading = false; this.refreshing = false; },
      error: err => {
        this.loading = false; this.refreshing = false;
        this.error = String(err?.error?.error || 'No se pudieron consultar las personas con acceso.');
      }
    });
  }

  changeAccess(item: InventoryShare): void {
    if (this.updatingShareId !== null) return;
    const level: 1 | 2 = item.accessLevel === 2 ? 1 : 2;
    const label = level === 2 ? 'Editor' : 'Solo Lector';
    this.confirms.confirm({
      title: 'Modificar nivel de permiso',
      message: `¿Cambiar el acceso de «${item.username || 'este usuario'}» a ${label}?`,
      confirmLabel: `Cambiar a ${label}`, tone: 'primary', icon: 'swap_horiz'
    }).subscribe(ok => {
      if (!ok) return;
      this.updatingShareId = item.id;
      this.api.updateShareAccess(item.id, level).subscribe({
        next: () => {
          this.shares = this.shares.map(s => s.id === item.id ? { ...s, accessLevel: level } : s);
          this.updatingShareId = null;
          this.toast.success(`Permiso actualizado a ${label}.`);
        },
        error: err => {
          this.updatingShareId = null;
          this.toast.error(String(err?.error?.error || 'No se pudo actualizar el permiso.'));
        }
      });
    });
  }

  revoke(item: InventoryShare): void {
    this.confirms.confirm({
      title: 'Revocar acceso de inventario',
      message: `¿Revocar definitivamente el acceso a «${item.username || 'este usuario'}»? El inventario y su historial no se verán afectados.`,
      confirmLabel: 'Sí, revocar acceso', tone: 'danger', icon: 'person_remove'
    }).subscribe(ok => {
      if (!ok) return;
      this.api.revoke(item.id).subscribe({
        next: () => { this.toast.success('Acceso revocado correctamente.'); this.load(); },
        error: err => this.toast.error(String(err?.error?.error || 'No se pudo revocar el acceso.'))
      });
    });
  }
}
