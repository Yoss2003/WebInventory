import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UiButtonDirective } from '../../../shared/ui/v2/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/v2/ui-control.directive';
import { InventoryService, InventorySummary } from '../../../core/services/inventories';
import { ToastService } from '../../../shared/toast/toast.service';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';

export interface InventoryEditDialogData {
  inventory: InventorySummary;
}

@Component({
  selector: 'app-inventory-edit-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatIconModule,
    UiButtonDirective, UiControlDirective, LoadingIndicatorComponent
  ],
  templateUrl: './inventory-edit-dialog.component.html',
  styleUrl: './inventory-edit-dialog.component.scss'
})
export class InventoryEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<InventoryEditDialogComponent>);
  readonly data: InventoryEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly api = inject(InventoryService);
  private readonly toast = inject(ToastService);

  name = this.data.inventory.inventoryName || '';
  alias = this.data.inventory.alias || '';
  saving = false;
  error = '';

  get isValid(): boolean {
    return this.name.trim().length > 0 && this.name.trim().length <= 255;
  }

  save(): void {
    if (!this.isValid || this.saving) return;
    this.saving = true;
    this.error = '';

    const updatedName = this.name.trim();
    const updatedAlias = this.alias.trim() || null;

    this.api.update(this.data.inventory, updatedName, updatedAlias).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Inventario actualizado correctamente.');
        this.dialogRef.close({
          ...this.data.inventory,
          inventoryName: updatedName,
          alias: updatedAlias
        });
      },
      error: err => {
        this.saving = false;
        this.error = String(err?.error?.error || 'No se pudo actualizar el inventario.');
      }
    });
  }
}
