import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { UiPageHeadingComponent } from '../../shared/ui/components/ui-page-heading.component';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { UiTableActionDirective } from '../../shared/ui/directives/ui-table-action.directive';
import { ConfirmationDialogService } from '../../shared/confirm-dialog/confirmation-dialog.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AccessService } from '../../core/services/access';
import { InventoryService, InventorySummary } from '../../core/services/inventories';
import { UserManagementService, ManagedUser } from '../../core/services/user-management';
import { EmployeeService } from '../../core/services/employees';
import { Employee } from '../../core/models/employee.model';
import { LoadingIndicatorComponent } from '../../shared/loading/loading-indicator';
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
    MatDialogModule, RouterLink, UiPageHeadingComponent, UiButtonDirective,
    UiTableActionDirective, LoadingIndicatorComponent
  ],
  templateUrl: './inventory-management.html',
  styleUrl: './inventory-management.scss'
})
export class InventoryManagementComponent implements OnInit {
  private readonly api = inject(InventoryService);
  private readonly usersApi = inject(UserManagementService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly access = inject(AccessService);
  private readonly toast = inject(ToastService);
  private readonly confirms = inject(ConfirmationDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);

  isManager = false;
  canCreate = false;
  canManageAccess = false;
  selfId = 0;
  loading = true; // Inicia inmediatamente en true para evitar pantalla vacía
  error = '';
  rows: InventorySummary[] = [];
  users: ManagedUser[] = [];
  employees: Employee[] = [];

  get operational(): InventorySummary[] {
    return this.rows.filter(r => !r.isMaster);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.access.me().subscribe({
      next: a => {
        this.selfId = a.userId;
        this.isManager = a.isDeveloper || a.isAdministrator;
        this.canCreate = (a.permissions || []).includes('CREATE_INVENTORIES');
        this.canManageAccess = (a.permissions || []).includes('MANAGE_INVENTORY_ACCESS');

        const members = this.isManager ? this.usersApi.users().pipe(catchError(() => of([] as ManagedUser[]))) : of([] as ManagedUser[]);
        const inventories = this.isManager ? this.api.companyInventories() : this.api.getInventories();
        const employeesReq = this.employeesApi.getEmployees().pipe(catchError(() => of([] as Employee[])));

        forkJoin({ inventories, users: members, employees: employeesReq }).subscribe({
          next: ({ inventories, users, employees }) => {
            this.rows = (inventories || []).filter(i => i.isActive);
            this.users = (users || []).filter(u => u.isActive && u.statusId === 1);
            this.employees = (employees || []).filter(e => e.isActive);
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: e => {
            this.loading = false;
            this.error = String(e?.error?.error || 'No se pudieron cargar inventarios y usuarios.');
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron verificar los permisos de la sesión.';
        this.cdr.markForCheck();
      }
    });
  }

  ownerName(id: number): string {
    const emp = this.employees.find(e => e.userId === id);
    if (emp) {
      const full = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      if (full) return `${full} (${emp.user?.username || emp.dni || 'ID #' + id})`;
    }
    const user = this.users.find(x => x.id === id);
    if (user) {
      const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return full ? `${full} (${user.username})` : user.username;
    }
    return id === this.selfId ? 'Mi cuenta' : `Usuario #${id}`;
  }

  openCreateDialog(): void {
    if (!this.canCreate) return;

    const dialogRef = this.dialog.open(InventoryCreateDialogComponent, {
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
      if (result) {
        this.load();
      }
    });
  }

  manageShares(row: InventorySummary): void {
    if (!this.canManageAccess || (!this.isManager && row.userId !== this.selfId)) return;

    const dialogRef = this.dialog.open(ShareInventoryDialogComponent, {
      width: '720px',
      maxWidth: '96vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: {
        inventory: row,
        allInventories: this.operational,
        isManager: this.isManager,
        users: this.users,
        employees: this.employees,
        selfId: this.selfId
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.load();
    });
  }

  edit(row: InventorySummary): void {
    if (!this.canCreate || (!this.isManager && row.userId !== this.selfId)) return;

    const dialogRef = this.dialog.open(InventoryEditDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: {
        inventory: row
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.load();
      }
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
