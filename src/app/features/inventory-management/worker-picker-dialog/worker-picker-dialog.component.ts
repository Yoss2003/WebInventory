import { Component, inject, OnInit } from '@angular/core';
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
import { timeout } from 'rxjs';

export interface WorkerPickerDialogData {
  inventoryId: number;
  excludeUserId?: number | null;
}

@Component({
  selector: 'app-worker-picker-dialog', standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatTooltipModule, UiButtonDirective, UiControlDirective, LoadingIndicatorComponent, ModalShellComponent],
  templateUrl: './worker-picker-dialog.component.html',
  styleUrl: './worker-picker-dialog.component.scss'
})
export class WorkerPickerDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<WorkerPickerDialogComponent>);
  readonly data: WorkerPickerDialogData = inject(MAT_DIALOG_DATA);
  private readonly api = inject(InventoryService);
  loading = false;
  refreshing = false;
  private hasLoadedOnce = false;
  error = '';
  search = '';
  employees: InventoryShareRecipient[] = [];

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
    this.loading = !this.hasLoadedOnce && !fromRefresh;
    this.refreshing = fromRefresh;
    this.error = '';
    this.api.getShareRecipients(this.data.inventoryId).pipe(
      timeout({ first: 15000 })
    ).subscribe({
      next: rows => {
        this.employees = (rows || []).filter(e => e.userId > 0 && e.userId !== this.data.excludeUserId);
        this.loading = false;
        this.refreshing = false;
        this.hasLoadedOnce = true;
      },
      error: err => {
        this.loading = false;
        this.refreshing = false;
        this.hasLoadedOnce = true;
        this.error = err?.name === 'TimeoutError'
          ? 'La consulta de empleados tardó demasiado. Puedes volver a intentarlo.'
          : String(err?.error?.error || 'No se pudieron consultar los colaboradores disponibles.');
      }
    });
  }

  refresh(): void { this.load(true); }
  select(employee: InventoryShareRecipient): void { this.dialogRef.close(employee); }
}
