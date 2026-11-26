import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService, InventorySummary, InventoryShare } from '../../../core/services/inventories';
import { Employee } from '../../../core/models/employee.model';
import { ManagedUser } from '../../../core/services/user-management';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmationDialogService } from '../../../shared/confirm-dialog/confirmation-dialog.service';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiTableActionDirective } from '../../../shared/ui/directives/ui-table-action.directive';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import { UiPaginationComponent } from '../../../shared/ui/components/ui-pagination/ui-pagination.component';
import { finalize, timeout } from 'rxjs';

export interface InventorySharesDialogData {
  inventory: InventorySummary;
  employees?: Employee[];
  users?: ManagedUser[];
  selfId?: number;
}

@Component({
  selector: 'app-inventory-shares-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, UiButtonDirective, UiTableActionDirective, LoadingIndicatorComponent, ModalShellComponent, UiPaginationComponent],
  templateUrl: './inventory-shares-dialog.component.html',
  styleUrl: './inventory-shares-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventorySharesDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<InventorySharesDialogComponent>);
  readonly data: InventorySharesDialogData = inject(MAT_DIALOG_DATA);
  private readonly api = inject(InventoryService);
  private readonly toast = inject(ToastService);
  private readonly confirms = inject(ConfirmationDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  shares: InventoryShare[] = [];
  page = 1;
  pageSize = 10;
  get paginatedShares(): InventoryShare[] { const start = (this.page - 1) * this.pageSize; return this.shares.slice(start, start + this.pageSize); }
  loading = false;
  refreshing = false;
  error = '';
  updatingShareId: number | null = null;
  private hasLoadedOnce = false;
  private requestId = 0;

  ngOnInit(): void { this.load(); }

  close(): void { this.dialogRef.close(); }

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

  getShareName(share: InventoryShare): string {
    const name = `${share.firstName || ''} ${share.lastName || ''}`.trim();
    return name || share.username || this.getOwnerName(share.userId);
  }

  getEmail(userId: number): string | null {
    const employee = this.data.employees?.find(e => e.userId === userId);
    if (employee?.user?.email) return employee.user.email;
    return this.data.users?.find(u => u.id === userId)?.email || null;
  }

  load(): void {
    if (this.loading || this.refreshing) return;
    const requestId = ++this.requestId;
    const keepExisting = this.hasLoadedOnce;
    this.loading = !keepExisting;
    this.refreshing = keepExisting;
    this.error = '';
    this.cdr.markForCheck();

    this.api.getShares(this.data.inventory.id).pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        if (requestId !== this.requestId) return;
        this.loading = false;
        this.refreshing = false;
        this.hasLoadedOnce = true;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: rows => {
        if (requestId !== this.requestId) return;
        this.shares = Array.isArray(rows) ? rows : [];
        this.error = '';
        this.cdr.markForCheck();
      },
      error: err => {
        if (requestId !== this.requestId) return;
        this.error = err?.name === 'TimeoutError'
          ? 'La consulta de personas con acceso tardó demasiado. Puedes volver a intentarlo.'
          : String(err?.error?.error || 'No se pudieron consultar las personas con acceso.');
        this.cdr.markForCheck();
      }
    });
  }

  changeAccess(item: InventoryShare): void {
    if (this.updatingShareId !== null) return;
    const level: 1 | 2 = item.accessLevel === 2 ? 1 : 2;
    const label = level === 2 ? 'Editor' : 'Solo Lector';
    this.confirms.confirm({
      title: 'Modificar nivel de permiso',
      message: `¿Cambiar el acceso de «${item.username || this.getShareName(item)}» a ${label}?`,
      confirmLabel: `Cambiar a ${label}`, tone: 'primary', icon: 'swap_horiz'
    }).subscribe(ok => {
      if (!ok || this.updatingShareId !== null) return;
      this.updatingShareId = item.id;
      this.cdr.markForCheck();
      this.api.updateShareAccess(item.id, level).pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          this.updatingShareId = null;
          this.cdr.markForCheck();
        })
      ).subscribe({
        next: () => {
          this.shares = this.shares.map(s => s.id === item.id ? { ...s, accessLevel: level } : s);
          this.toast.success(`Permiso actualizado a ${label}.`);
          this.cdr.markForCheck();
        },
        error: err => {
          this.toast.error(err?.name === 'TimeoutError'
            ? 'La actualización tardó demasiado. Verifica el permiso antes de volver a intentarlo.'
            : String(err?.error?.error || 'No se pudo actualizar el permiso.'));
          this.cdr.markForCheck();
        }
      });
    });
  }

  revoke(item: InventoryShare): void {
    this.confirms.confirm({
      title: 'Revocar acceso de inventario',
      message: `¿Revocar definitivamente el acceso a «${item.username || this.getShareName(item)}»? El inventario y su historial no se verán afectados.`,
      confirmLabel: 'Sí, revocar acceso', tone: 'danger', icon: 'person_remove'
    }).subscribe(ok => {
      if (!ok) return;
      this.api.revoke(item.id).pipe(timeout({ first: 15000 })).subscribe({
        next: () => {
          this.toast.success('Acceso revocado correctamente.');
          this.load();
        },
        error: err => this.toast.error(err?.name === 'TimeoutError'
          ? 'La revocación tardó demasiado. Actualiza la lista para comprobar el estado.'
          : String(err?.error?.error || 'No se pudo revocar el acceso.'))
      });
    });
  }
}
