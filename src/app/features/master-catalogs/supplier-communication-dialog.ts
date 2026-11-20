import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../shared/ui/directives/ui-control.directive';

export interface SupplierCommunicationData {
  contactName: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'app-supplier-communication-dialog',
  standalone: true,
  imports: [FormsModule, UiButtonDirective, UiControlDirective],
  templateUrl: './supplier-communication-dialog.html',
  styleUrl: './supplier-communication-dialog.scss'
})
export class SupplierCommunicationDialogComponent {
  readonly data = inject<SupplierCommunicationData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SupplierCommunicationDialogComponent, SupplierCommunicationData>>(MatDialogRef);

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
