import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ModalStandardService } from '../../shared/ui/services/modal-standard.service';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';

import { UiPageHeadingComponent } from '../../shared/ui/components/ui-page-heading.component';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { UiTableActionDirective } from '../../shared/ui/directives/ui-table-action.directive';
import { ConfirmationDialogService } from '../../shared/confirm-dialog/confirmation-dialog.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AccessService } from '../../core/services/access';
import { InventoryService, InventorySummary } from '../../core/services/inventories';
import { UserManagementService, ManagedUser } from '../../core/services/user-management';
import { LoadingIndicatorComponent } from '../../shared/loading/loading-indicator';
import { UiPaginationComponent } from '../../shared/ui/components/ui-pagination/ui-pagination.component';
import { InventoryEditDialogComponent } from './inventory-edit-dialog/inventory-edit-dialog.component';
import { InventoryCreateDialogComponent } from './inventory-create-dialog/inventory-create-dialog.component';
import { ShareInventoryDialogComponent } from './share-inventory-dialog/share-inventory-dialog.component';
import { UiStatusComponent } from '../../shared/ui/components/ui-status.component';
import { UiEmptyStateComponent } from '../../shared/ui/components/ui-empty-state.component';

@Component({
  selector: 'app-inventory-management',
  standalone: true,
  imports: [
    UiEmptyStateComponent, UiStatusComponent,
    CommonModule, FormsModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    RouterLink, UiPageHeadingComponent, UiButtonDirective,
    UiTableActionDirective, LoadingIndicatorComponent, UiPaginationComponent
  ],
  templateUrl: './inventory-management.html',
  styleUrl: './inventory-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryManagementComponent implements OnInit {
  private readonly api = inject(InventoryService);
  private readonly usersApi = inject(UserManagementService);
  private readonly access = inject(AccessService);
  private readonly toast = inject(ToastService);
  private readonly confirms = inject(ConfirmationDialogService);
  private readonly modalStandards = inject(ModalStandardService);
  private readonly cdr = inject(ChangeDetectorRef);

  private inventoryRequestId = 0;
  private usersRequestId = 0;

  isManager = false;
  canCreate = false;
  canManageAccess = false;
  selfId = 0;
  loading = true;
  refreshing = false;
  usersLoading = false;
  private hasLoadedOnce = false;
  error = '';
  rows: InventorySummary[] = [];
  users: ManagedUser[] = [];
  page = 1;
  pageSize = 10;
  get paginatedOperational(): InventorySummary[] { const start = (this.page - 1) * this.pageSize; return this.operational.slice(start, start + this.pageSize); }

  get operational(): InventorySummary[] {
    return this.rows.filter(r => !r.isMaster);
  }

  ngOnInit(): void {
    this.load();
  }

  load(fromRefresh = false): void {
    const requestId = ++this.inventoryRequestId;
    this.loading = !this.hasLoadedOnce && !fromRefresh;
    this.refreshing = fromRefresh;
    this.error = '';
    this.cdr.markForCheck();

    this.access.me().pipe(timeout({ first: 12000 })).subscribe({
      next: a => {
        if (requestId !== this.inventoryRequestId) return;

        this.selfId = a.userId;
        this.isManager = a.isDeveloper || a.isAdministrator;
        this.canCreate = (a.permissions || []).includes('CREATE_INVENTORIES');
        this.canManageAccess = (a.permissions || []).includes('MANAGE_INVENTORY_ACCESS');

        const usersRequestId = ++this.usersRequestId;
        if (this.isManager) {
          this.usersLoading = true;
          this.usersApi.users().pipe(
            timeout({ first: 15000 }),
            finalize(() => {
              if (usersRequestId !== this.usersRequestId) return;
              this.usersLoading = false;
              this.cdr.markForCheck();
            })
          ).subscribe({
            next: users => {
              if (usersRequestId !== this.usersRequestId) return;
              this.users = Array.isArray(users)
                ? users.filter(u => u.isActive && u.statusId === 1)
                : [];
              this.cdr.markForCheck();
            },
            error: () => {
              if (usersRequestId !== this.usersRequestId) return;
              this.users = [];
              this.cdr.markForCheck();
            }
          });
        } else {
          this.usersLoading = false;
          this.users = [];
        }

        const inventories$ = this.isManager
          ? this.api.companyInventories()
          : this.api.getInventories();

        inventories$.pipe(
          timeout({ first: 15000 }),
          finalize(() => {
            if (requestId !== this.inventoryRequestId) return;
            this.loading = false;
            this.refreshing = false;
            this.hasLoadedOnce = true;
            this.cdr.markForCheck();
          })
        ).subscribe({
          next: inventories => {
            if (requestId !== this.inventoryRequestId) return;
            this.rows = (inventories || []).filter(i => i.isActive);
            this.cdr.markForCheck();
          },
          error: e => {
            if (requestId !== this.inventoryRequestId) return;
            this.error = e?.name === 'TimeoutError'
              ? 'La consulta de inventarios tardó demasiado. Intenta actualizar nuevamente.'
              : String(e?.error?.error || 'No se pudieron cargar los inventarios.');
            this.cdr.markForCheck();
          }
        });
      },
      error: err => {
        if (requestId !== this.inventoryRequestId) return;
        this.loading = false;
        this.refreshing = false;
        this.usersLoading = false;
        this.hasLoadedOnce = true;
        this.error = err?.name === 'TimeoutError'
          ? 'La verificación de permisos tardó demasiado. Actualiza para volver a intentarlo.'
          : 'No se pudieron verificar los permisos de la sesión.';
        this.cdr.markForCheck();
      }
    });
  }

  ownerName(id: number): string {
    const user = this.users.find(x => x.id === id);
    if (user) {
      const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return full ? `${full} (${user.username})` : user.username;
    }
    return id === this.selfId ? 'Mi cuenta' : `Usuario #${id}`;
  }

  openCreateDialog(): void {
    if (!this.canCreate || (this.isManager && this.usersLoading)) return;

    const dialogRef = this.modalStandards.open(InventoryCreateDialogComponent, 'mainForm', {
      width: '520px',
      maxWidth: '94vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: {
        isManager: this.isManager,
        users: this.users,
        selfId: this.selfId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.load();
    });
  }

  manageShares(row: InventorySummary): void {
    if (!this.canManageAccess || (!this.isManager && row.userId !== this.selfId)) return;

    const dialogRef = this.modalStandards.open(ShareInventoryDialogComponent, 'wizard', {
      width: '820px',
      maxWidth: '96vw',
      maxHeight: 'calc(100dvh - 28px)',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: {
        inventory: row,
        isManager: this.isManager,
        users: this.users,
        selfId: this.selfId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.load();
    });
  }

  edit(row: InventorySummary): void {
    if (!this.canCreate || (!this.isManager && row.userId !== this.selfId)) return;

    const dialogRef = this.modalStandards.open(InventoryEditDialogComponent, 'mainForm', {
      width: '520px',
      maxWidth: '94vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: { inventory: row }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.load();
    });
  }

  deactivate(row: InventorySummary): void {
    if (!this.canCreate || (!this.isManager && row.userId !== this.selfId)) return;
    this.confirms.confirm({
      title: 'Desactivar inventario',
      message: `¿Desactivar «${row.alias || row.inventoryName}»? No debe tener artículos, movimientos, asignaciones ni accesos compartidos pendientes.`,
      confirmLabel: 'Desactivar',
      tone: 'danger',
      icon: 'block'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.deactivate(row.id).subscribe({
        next: () => {
          this.toast.success('Inventario desactivado.');
          this.load();
        },
        error: e => {
          this.toast.error(String(e?.error?.error || 'No se pudo desactivar el inventario.'));
        }
      });
    });
  }
}
