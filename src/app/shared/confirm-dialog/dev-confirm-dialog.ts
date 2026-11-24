import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UiButtonDirective } from '../ui/directives/ui-button.directive';
import { UiControlDirective } from '../ui/directives/ui-control.directive';
import { ModalShellComponent } from '../ui/components/modal-shell/modal-shell.component';
import type { ModalActionId, ModalFooterAction } from '../ui/models/modal-standard.model';

export interface DevConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'danger' | 'primary';
  icon?: string | null;
  /** Opcional para operaciones que necesitan una razón, como anular ventas. */
  requiresReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  maxReasonLength?: number;
}

@Component({
  selector: 'app-dev-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, FormsModule, UiButtonDirective, UiControlDirective, ModalShellComponent],
  templateUrl: './dev-confirm-dialog.html',
  styleUrl: './dev-confirm-dialog.scss'
})
export class DevConfirmDialogComponent {
  readonly data = inject<DevConfirmDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<DevConfirmDialogComponent, boolean | string>);
  reason = '';

  get maxLength(): number { return this.data.maxReasonLength ?? 500; }
  get canConfirm(): boolean {
    return !this.data.requiresReason ||
      (this.reason.trim().length > 0 && this.reason.trim().length <= this.maxLength);
  }

  get modalFooterActions(): ModalFooterAction[] {
    return [
      { id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 0 },
      { id: 'primary', label: this.data.confirmLabel, tone: this.data.tone, order: 1, disabled: !this.canConfirm }
    ];
  }

  handleModalAction(action: ModalActionId): void {
    if (action === 'cancel') this.dialogRef.close();
    if (action === 'primary') this.accept();
  }

  accept(): void {
    if (!this.canConfirm) return;
    this.dialogRef.close(this.data.requiresReason ? this.reason.trim() : true);
  }
}
