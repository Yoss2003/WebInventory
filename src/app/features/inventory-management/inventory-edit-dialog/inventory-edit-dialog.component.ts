import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { InventoryService, InventorySummary } from '../../../core/services/inventories';
import { ToastService } from '../../../shared/toast/toast.service';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import type { ModalActionId, ModalFooterAction } from '../../../shared/ui/models/modal-standard.model';

export interface InventoryEditDialogData {
  inventory: InventorySummary;
}

@Component({
  selector: 'app-inventory-edit-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule,
    UiControlDirective, ModalShellComponent
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

  get modalFooterActions(): ModalFooterAction[] {
    return [
      { id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 0, disabled: this.saving },
      { id: 'primary', label: 'Guardar cambios', tone: 'primary', icon: 'save', order: 1, disabled: !this.isValid || this.saving }
    ];
  }

  handleModalAction(action: ModalActionId): void {
    if (action === 'cancel' || action === 'close') this.dialogRef.close();
    if (action === 'primary') this.save();
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
