import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { InventoryService, InventorySummary } from '../../../core/services/inventories';
import { ManagedUser } from '../../../core/services/user-management';
import { ToastService } from '../../../shared/toast/toast.service';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';

export interface InventoryCreateDialogData {
  isManager: boolean;
  users: ManagedUser[];
  selfId: number;
}

@Component({
  selector: 'app-inventory-create-dialog',
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
    LoadingIndicatorComponent
  ],
  templateUrl: './inventory-create-dialog.component.html',
  styleUrl: './inventory-create-dialog.component.scss'
})
export class InventoryCreateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<InventoryCreateDialogComponent>);
  readonly data: InventoryCreateDialogData = inject(MAT_DIALOG_DATA);
  private readonly api = inject(InventoryService);
  private readonly toast = inject(ToastService);

  name = '';
  alias = '';
  ownerId = this.data.users?.some(u => u.id === this.data.selfId)
    ? this.data.selfId
    : (this.data.users?.[0]?.id ?? this.data.selfId ?? 0);

  saving = false;
  error = '';

  get isValid(): boolean {
    const trimmed = this.name.trim();
    if (!trimmed || trimmed.length > 255) return false;
    if (this.data.isManager && (!this.ownerId || this.ownerId <= 0)) return false;
    return true;
  }

  close(): void {
    if (this.saving) return;
    this.dialogRef.close();
  }

  create(): void {
    if (!this.isValid || this.saving) return;
    this.saving = true;
    this.error = '';

    const req = this.data.isManager
      ? this.api.assign(this.ownerId, this.name.trim(), this.alias.trim() || null)
      : this.api.create(this.name.trim(), this.alias.trim() || null);

    req.subscribe({
      next: (created: InventorySummary) => {
        this.saving = false;
        this.toast.success(`Inventario «${created.alias || created.inventoryName}» creado correctamente.`);
        this.dialogRef.close(created);
      },
      error: err => {
        this.saving = false;
        this.error = String(err?.error?.error || 'No se pudo crear el inventario.');
        this.toast.error(this.error);
      }
    });
  }
}
