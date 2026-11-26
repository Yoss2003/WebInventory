import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ModalStandardService } from '../../../shared/ui/services/modal-standard.service';
import { MatIconModule } from '@angular/material/icon';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';
import { InventoryDialogMotionDirective } from '../../../shared/ui/directives/inv-dialog-motion.directive';
import { InventoryService, InventorySummary, InventoryShare, InventoryShareRecipient } from '../../../core/services/inventories';
import { ManagedUser } from '../../../core/services/user-management';
import { InventorySharesDialogComponent } from '../inventory-shares-dialog/inventory-shares-dialog.component';
import { ToastService } from '../../../shared/toast/toast.service';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import type { ModalActionId, ModalFooterAction, ModalSection } from '../../../shared/ui/models/modal-standard.model';
import { WorkerPickerDialogComponent, WorkerPickerDialogData } from '../worker-picker-dialog/worker-picker-dialog.component';
import { finalize, timeout } from 'rxjs';

export interface ShareInventoryDialogData {
  inventory: InventorySummary;
  isManager?: boolean;
  users?: ManagedUser[];
  selfId?: number;
}

@Component({
  selector: 'app-share-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, InventoryDialogMotionDirective,
    UiButtonDirective, LoadingIndicatorComponent, ModalShellComponent
  ],
  templateUrl: './share-inventory-dialog.component.html',
  styleUrl: './share-inventory-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShareInventoryDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ShareInventoryDialogComponent>);
  readonly data: ShareInventoryDialogData = inject(MAT_DIALOG_DATA);
  private readonly modalStandards = inject(ModalStandardService);
  private readonly api = inject(InventoryService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  currentStep = 1;
  readonly selectedInventoryId = this.data.inventory?.id || 0;
  selectedEmployee: InventoryShareRecipient | null = null;
  accessLevel: 1 | 2 = 1;
  submitting = false;
  error = '';

  shares: InventoryShare[] = [];
  loadingShares = false;
  refreshingShares = false;
  sharesError = '';
  private hasLoadedShares = false;
  private sharesRequestId = 0;

  get currentInventory(): InventorySummary { return this.data.inventory; }

  get orderedShares(): InventoryShare[] {
    return [...this.shares].sort((a, b) => {
      const aName = this.displayShareName(a);
      const bName = this.displayShareName(b);
      return aName.localeCompare(bName, 'es', { sensitivity: 'base' });
    });
  }

  get totalAccessCount(): number {
    return this.shares.length + (this.currentInventory?.userId ? 1 : 0);
  }

  ngOnInit(): void {
    this.loadShares();
  }

  displayEmployee(employee: InventoryShareRecipient): string {
    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
    return fullName || employee.username || employee.email || `Usuario #${employee.userId}`;
  }

  displayShareName(share: InventoryShare): string {
    const fullName = `${share.firstName || ''} ${share.lastName || ''}`.trim();
    return fullName || share.username || `Usuario #${share.userId}`;
  }

  getOwnerName(userId: number): string {
    const user = this.data.users?.find(item => item.id === userId);
    if (user) {
      const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return full ? `${full} (${user.username})` : user.username;
    }
    return userId === this.data.selfId ? 'Mi cuenta' : `Usuario #${userId}`;
  }

  get isStep1Valid(): boolean {
    return !!this.selectedEmployee && this.selectedEmployee.userId > 0 &&
      (this.accessLevel === 1 || this.accessLevel === 2);
  }

  get collaboratorDisplay(): string {
    return this.selectedEmployee ? this.displayEmployee(this.selectedEmployee) : '';
  }

  get collaboratorExtra(): string {
    if (!this.selectedEmployee) return '';
    return [
      this.selectedEmployee.dni ? `DNI: ${this.selectedEmployee.dni}` : '',
      this.selectedEmployee.username ? `Usuario: ${this.selectedEmployee.username}` : '',
      this.selectedEmployee.email || ''
    ].filter(Boolean).join(' · ');
  }

  loadShares(fromRefresh = false): void {
    if (this.loadingShares || this.refreshingShares || !this.selectedInventoryId) return;

    const requestId = ++this.sharesRequestId;
    const keepExisting = this.hasLoadedShares && this.shares.length > 0;
    this.loadingShares = !keepExisting && !fromRefresh;
    this.refreshingShares = keepExisting || fromRefresh;
    this.sharesError = '';
    this.cdr.markForCheck();

    this.api.getShares(this.selectedInventoryId).pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        if (requestId !== this.sharesRequestId) return;
        this.loadingShares = false;
        this.refreshingShares = false;
        this.hasLoadedShares = true;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: rows => {
        if (requestId !== this.sharesRequestId) return;
        this.shares = Array.isArray(rows) ? rows : [];
        this.sharesError = '';
        this.cdr.markForCheck();
      },
      error: err => {
        if (requestId !== this.sharesRequestId) return;
        this.sharesError = err?.name === 'TimeoutError'
          ? 'La consulta de accesos tardó demasiado. Puedes volver a intentarlo.'
          : String(err?.error?.error || 'No se pudieron consultar las personas con acceso a este inventario.');
        this.cdr.markForCheck();
      }
    });
  }

  openWorkerPicker(): void {
    if (this.submitting || !this.selectedInventoryId) return;

    const dialogRef = this.modalStandards.open<
      WorkerPickerDialogComponent,
      WorkerPickerDialogData,
      InventoryShareRecipient
    >(WorkerPickerDialogComponent, 'selector', {
      width: 'min(780px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: {
        inventoryId: this.selectedInventoryId,
        excludeUserId: this.data.selfId
      },
      autoFocus: 'first-tabbable',
      restoreFocus: true
    });

    dialogRef.afterClosed().subscribe(recipient => {
      if (!recipient || recipient.userId <= 0) return;
      this.selectedEmployee = recipient;
      this.error = '';
      this.cdr.markForCheck();
    });
  }

  openSharesDialog(): void {
    this.modalStandards.open(InventorySharesDialogComponent, 'detail', {
      width: 'min(620px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 28px)',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      data: { inventory: this.currentInventory, users: this.data.users, selfId: this.data.selfId }
    });
  }

  get modalSections(): ModalSection[] {
    return [
      { id: 'access', label: 'Acceso y permisos', completed: this.currentStep > 1 && this.isStep1Valid },
      { id: 'summary', label: 'Resumen', disabled: this.submitting || !this.isStep1Valid }
    ];
  }

  get modalFooterActions(): ModalFooterAction[] {
    const actions: ModalFooterAction[] = [];
    if (this.currentStep > 1) {
      actions.push({ id: 'previous', label: 'Anterior', tone: 'secondary', icon: 'arrow_back', order: 0, disabled: this.submitting });
    }
    actions.push({ id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 1, disabled: this.submitting });
    if (this.currentStep === 1) {
      actions.push({ id: 'next', label: 'Siguiente: Resumen', tone: 'primary', icon: 'arrow_forward', order: 2, disabled: !this.isStep1Valid || this.submitting });
    } else {
      actions.push({ id: 'primary', label: 'Conceder acceso', tone: 'primary', icon: 'group_add', order: 2, disabled: !this.isStep1Valid || this.submitting });
    }
    return actions;
  }

  handleModalAction(action: ModalActionId): void {
    switch (action) {
      case 'previous': this.setStep(1); break;
      case 'cancel':
      case 'close': this.close(); break;
      case 'next': this.setStep(2); break;
      case 'primary': this.submitShare(); break;
    }
  }

  close(): void {
    if (!this.submitting) this.dialogRef.close();
  }

  setStep(step: number): void {
    if (this.submitting || step < 1 || step > 2 || (step === 2 && !this.isStep1Valid)) return;
    this.currentStep = step;
    this.error = '';
    this.cdr.markForCheck();
  }

  submitShare(): void {
    const guestUserId = this.selectedEmployee?.userId;
    if (!this.isStep1Valid || !guestUserId || this.submitting) return;
    this.submitting = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api.share(this.selectedInventoryId, '', this.accessLevel, guestUserId).pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        this.submitting = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.toast.success(`Acceso concedido exitosamente a ${this.collaboratorDisplay}.`);
        this.dialogRef.close(true);
      },
      error: err => {
        this.error = err?.name === 'TimeoutError'
          ? 'La autorización tardó demasiado en responder. Comprueba el acceso antes de volver a intentarlo.'
          : String(err?.error?.error || 'No se pudo compartir el inventario.');
        this.cdr.markForCheck();
      }
    });
  }
}
