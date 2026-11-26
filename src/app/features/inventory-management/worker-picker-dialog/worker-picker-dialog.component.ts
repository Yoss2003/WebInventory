import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { InventoryService, InventoryShareRecipient } from '../../../core/services/inventories';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import { UiPaginationComponent } from '../../../shared/ui/components/ui-pagination/ui-pagination.component';
import { finalize, timeout } from 'rxjs';

export interface WorkerPickerDialogData {
  inventoryId: number;
  excludeUserId?: number | null;
}

@Component({
  selector: 'app-worker-picker-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatTooltipModule, UiButtonDirective, UiControlDirective, LoadingIndicatorComponent, ModalShellComponent, UiPaginationComponent],
  templateUrl: './worker-picker-dialog.component.html',
  styleUrl: './worker-picker-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkerPickerDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<WorkerPickerDialogComponent>);
  readonly data: WorkerPickerDialogData = inject(MAT_DIALOG_DATA);
  private readonly api = inject(InventoryService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  refreshing = false;
  private hasLoadedOnce = false;
  error = '';
  search = '';
  employees: InventoryShareRecipient[] = [];
  page = 1;
  pageSize = 10;
  get paginatedEmployees(): InventoryShareRecipient[] { const start = (this.page - 1) * this.pageSize; return this.filteredEmployees.slice(start, start + this.pageSize); }

  get filteredEmployees(): InventoryShareRecipient[] {
    const term = this.search.trim().toLowerCase();
    const visible = this.employees.filter(e => e.userId > 0 && e.userId !== this.data.excludeUserId);
    if (!term) return visible;
    return visible.filter(e => {
      const fullName = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
      const dni = (e.dni || '').toLowerCase();
      const username = (e.username || '').toLowerCase();
      const email = (e.email || '').toLowerCase();
      return fullName.includes(term) || dni.includes(term) || username.includes(term) || email.includes(term);
    });
  }

  ngOnInit(): void { this.load(); }

  load(fromRefresh = false): void {
    if (this.loading || this.refreshing) return;

    this.loading = !this.hasLoadedOnce && !fromRefresh;
    this.refreshing = fromRefresh;
    this.error = '';
    this.cdr.markForCheck();

    if (!Number.isInteger(this.data.inventoryId) || this.data.inventoryId <= 0) {
      this.loading = false;
      this.refreshing = false;
      this.hasLoadedOnce = true;
      this.error = 'No se identificó un inventario válido para consultar los colaboradores.';
      this.cdr.markForCheck();
      return;
    }

    this.api.getShareRecipients(this.data.inventoryId).pipe(
      timeout({ first: 12000 }),
      finalize(() => {
        this.loading = false;
        this.refreshing = false;
        this.hasLoadedOnce = true;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: rows => {
        const payload = rows as unknown;
        const list = Array.isArray(payload)
          ? payload as InventoryShareRecipient[]
          : payload && typeof payload === 'object' &&
            Array.isArray((payload as { items?: unknown }).items)
              ? (payload as { items: InventoryShareRecipient[] }).items
              : [];

        this.employees = list.filter(employee =>
          !!employee && Number(employee.userId) > 0 &&
          employee.userId !== this.data.excludeUserId
        );
        this.cdr.markForCheck();
      },
      error: err => {
        this.employees = [];
        this.error = err?.name === 'TimeoutError'
          ? 'La consulta de empleados tardó demasiado. Puedes volver a intentarlo.'
          : err?.status === 404
            ? 'No se encontró la lista de colaboradores para este inventario. Comprueba que la API esté actualizada y que el inventario siga activo.'
            : String(err?.error?.error || 'No se pudieron consultar los colaboradores disponibles.');
        this.cdr.markForCheck();
      }
    });
  }

  refresh(): void { this.load(true); }

  select(employee: InventoryShareRecipient): void {
    this.dialogRef.close(employee);
  }
}
