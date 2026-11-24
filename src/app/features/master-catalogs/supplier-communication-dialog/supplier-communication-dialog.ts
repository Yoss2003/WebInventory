import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import type { ModalActionId, ModalFooterAction } from '../../../shared/ui/models/modal-standard.model';

export interface SupplierCommunicationData {
  contactName: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'app-supplier-communication-dialog',
  standalone: true,
  imports: [FormsModule, MatIconModule, UiButtonDirective, UiControlDirective, ModalShellComponent],
  templateUrl: './supplier-communication-dialog.html',
  styleUrl: './supplier-communication-dialog.scss'
})
export class SupplierCommunicationDialogComponent {
  readonly data = inject<SupplierCommunicationData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SupplierCommunicationDialogComponent, SupplierCommunicationData>>(MatDialogRef);

  get modalFooterActions(): ModalFooterAction[] {
    return [
      { id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 0 },
      { id: 'primary', label: 'Aplicar datos', tone: 'primary', order: 1 }
    ];
  }

  handleModalAction(action: ModalActionId): void {
    if (action === 'cancel') this.close();
    if (action === 'primary') this.save();
  }

  save(): void {
    this.dialogRef.close({
      contactName: this.data.contactName.trim(),
      phone: this.data.phone.trim(),
      email: this.data.email.trim()
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
