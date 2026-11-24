import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';

export interface SaleInfoDialogData {
  kind: 'schedule' | 'summary';
  title: string;
  schedule?: Array<{ number: number; date: Date; amount: number }>;
  installmentFrequency?: string;
  installmentCount?: number;
  financedAmount?: number;
  articleName?: string;
  buyerName?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  paymentMethod?: string;
  walletProvider?: string;
  downPayment?: number;
}

@Component({
  selector: 'app-sale-info-dialog',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
  templateUrl: './sale-info-dialog.html',
  styleUrl: './sale-info-dialog.scss'
})
export class SaleInfoDialogComponent {
  readonly data = inject<SaleInfoDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SaleInfoDialogComponent>);

  close(): void {
    this.dialogRef.close();
  }
}
