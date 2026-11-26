import { ModalStandardService } from '../../shared/ui/services/modal-standard.service';
import { WorkerPickerDialogComponent } from '../inventory-management/worker-picker-dialog/worker-picker-dialog.component';
import { InventoryShareRecipient } from '../../core/services/inventories';
import { UiControlDirective } from '../../shared/ui/directives/ui-control.directive';
import { UiPaginationComponent } from '../../shared/ui/components/ui-pagination/ui-pagination.component';
import { UiPageHeadingComponent } from '../../shared/ui/components/ui-page-heading.component';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { UiTableActionDirective } from '../../shared/ui/directives/ui-table-action.directive';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastService } from '../../shared/toast/toast.service';
import { ConfirmationDialogService } from '../../shared/confirm-dialog/confirmation-dialog.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { InventoryService, InventoryShare, InventorySummary } from '../../core/services/inventories';
import { AccessService } from '../../core/services/access';
import { LoadingIndicatorComponent } from '../../shared/loading/loading-indicator';
import { finalize, timeout } from 'rxjs';

@Component({
  selector: 'app-inventory-sharing', standalone: true,
  imports: [UiControlDirective, UiPageHeadingComponent, UiButtonDirective, UiTableActionDirective, CommonModule, FormsModule, MatIconModule, MatTooltipModule, MatFormFieldModule, MatSelectModule, LoadingIndicatorComponent, UiPaginationComponent],
  templateUrl: './inventory-sharing.html', styleUrl: './inventory-sharing.scss'
})
export class InventorySharingComponent implements OnInit {
  private readonly api = inject(InventoryService);
  private readonly access = inject(AccessService);
  private readonly toast = inject(ToastService);
  private readonly confirms = inject(ConfirmationDialogService);
  private readonly modalStandards = inject(ModalStandardService);
  private readonly cdr = inject(ChangeDetectorRef);
  myUserId = 0;
  canManageAccess = false;
  inventories: InventorySummary[] = [];
  currentInventoryId: number | null = null;
  shares: InventoryShare[] = [];
  page = 1;
  pageSize = 10;
  get paginatedShares(): InventoryShare[] { const start = (this.page - 1) * this.pageSize; return this.shares.slice(start, start + this.pageSize); }
  identifier = '';
  recipientUserId: number | null = null;
  accessLevel: 1 | 2 = 1;
  loading = false;
  hasLoaded = false;
  loadingShares = false;
  sharesLoaded = false;
  saving = false;
  updatingShareId: number | null = null;
  error = '';
  sharesError = '';
  private requestId = 0;
  private loadedSharesInventoryId: number | null = null;

  get ownedInventories(): InventorySummary[] {
    return this.inventories.filter(x => x.userId === this.myUserId && x.isActive && !x.isMaster);
  }
  get labelCount(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const inv of this.ownedInventories) {
      const key = (inv.alias || inv.inventoryName || 'Sin nombre').trim().toLocaleLowerCase('es');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }
  inventoryLabel(inv: InventorySummary): string {
    const label = (inv.alias || inv.inventoryName || 'Sin nombre').trim();
    return (this.labelCount.get(label.toLocaleLowerCase('es')) || 0) > 1 ? `${label} · ID ${inv.id}` : label;
  }

  ngOnInit(): void {
    this.access.me().subscribe({
      next: snapshot => {
        this.myUserId = snapshot.userId;
        this.canManageAccess = (snapshot.permissions || []).includes('MANAGE_INVENTORY_ACCESS');
        this.refresh();
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron verificar los permisos de la sesión.';
        this.cdr.markForCheck();
      }
    });
  }

  refresh(): void {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    this.api.getInventories().pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        this.loading = false;
        this.hasLoaded = true;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: values => {
        this.inventories = Array.isArray(values) ? values : [];
        if (!this.ownedInventories.some(x => x.id === this.currentInventoryId)) {
          this.currentInventoryId = this.ownedInventories[0]?.id ?? null;
          this.shares = [];
          this.sharesLoaded = false;
          this.sharesError = '';
          this.loadedSharesInventoryId = null;
        }
        if (this.currentInventoryId) this.loadShares();
        else {
          this.requestId++;
          this.shares = [];
          this.loadingShares = false;
          this.sharesLoaded = false;
          this.sharesError = '';
        }
      },
      error: err => {
        this.error = err?.name === 'TimeoutError'
          ? 'La consulta de inventarios tardó demasiado. Intenta actualizar nuevamente.'
          : String(err?.error?.error || 'No se pudieron consultar los inventarios. Los datos anteriores pueden estar desactualizados.');
      }
    });
  }

  loadShares(): void {
    const inventoryId = this.currentInventoryId;
    if (!inventoryId) {
      this.shares = [];
      this.sharesLoaded = false;
      this.loadingShares = false;
      this.sharesError = '';
      this.requestId++;
      this.cdr.markForCheck();
      return;
    }

    const requestId = ++this.requestId;
    this.loadingShares = true;
    this.sharesError = '';
    if (this.loadedSharesInventoryId !== inventoryId) {
      this.sharesLoaded = false;
      this.shares = [];
      this.loadedSharesInventoryId = inventoryId;
    }
    this.cdr.markForCheck();

    this.api.getShares(inventoryId).pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        if (requestId !== this.requestId || inventoryId !== this.currentInventoryId) return;
        this.loadingShares = false;
        this.sharesLoaded = true;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: data => {
        if (requestId !== this.requestId || inventoryId !== this.currentInventoryId) return;
        this.shares = Array.isArray(data) ? data : [];
        this.sharesError = '';
      },
      error: err => {
        if (requestId !== this.requestId || inventoryId !== this.currentInventoryId) return;
        this.sharesError = err?.name === 'TimeoutError'
          ? 'La consulta de colaboradores tardó demasiado. Actualiza para volver a intentarlo.'
          : String(err?.error?.error || 'No se pudieron consultar los permisos de este inventario.');
      }
    });
  }

  openWorkerPicker(): void {
    const dialogRef = this.modalStandards.open(WorkerPickerDialogComponent, 'selector', {
      width: '780px',
      maxWidth: '96vw',
      panelClass: 'inv-v2-dialog-panel',
      data: {
        inventoryId: this.currentInventoryId || 0,
        excludeUserId: this.myUserId
      }
    });

    dialogRef.afterClosed().subscribe((recipient: InventoryShareRecipient | undefined) => {
      if (recipient) {
        this.recipientUserId = recipient.userId;
        this.identifier = `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || recipient.username;
        this.cdr.markForCheck();
      }
    });
  }

  onIdentifierInput(_value: string): void {
    this.recipientUserId = null;
  }

  share(): void {
    if (!this.canManageAccess || !this.currentInventoryId || (!this.recipientUserId && !this.identifier.trim()) || this.saving) return;
    this.saving = true;
    this.cdr.markForCheck();
    this.api.share(this.currentInventoryId, this.recipientUserId ? '' : this.identifier.trim(), this.accessLevel, this.recipientUserId).subscribe({
      next: () => {
        this.saving = false;
        this.identifier = '';
        this.recipientUserId = null;
        this.toast.success('Acceso otorgado al inventario.');
        this.loadShares();
        this.cdr.markForCheck();
      },
      error: err => {
        this.saving = false;
        this.toast.error(String(err?.error?.error ?? 'No se pudo compartir el inventario.'));
        this.cdr.markForCheck();
      }
    });
  }

  changeAccess(item: InventoryShare): void {
    if (!this.canManageAccess || this.updatingShareId !== null) return;
    const nextAccess: 1 | 2 = item.accessLevel === 2 ? 1 : 2;
    const nextLabel = nextAccess === 2 ? 'Editor' : 'Lector';
    this.confirms.confirm({
      title: 'Cambiar permiso',
      message: `¿Cambiar el acceso de «${item.username || 'este usuario'}» a ${nextLabel}?`,
      confirmLabel: `Cambiar a ${nextLabel}`, tone: 'primary', icon: 'swap_horiz'
    }).subscribe(confirmed => {
      if (!confirmed || !this.canManageAccess || this.updatingShareId !== null) return;
      this.updatingShareId = item.id;
      this.api.updateShareAccess(item.id, nextAccess).subscribe({
        next: () => {
          this.shares = this.shares.map(row => row.id === item.id ? { ...row, accessLevel: nextAccess } : row);
          this.updatingShareId = null;
          this.toast.success(`Permiso actualizado a ${nextLabel}.`);
          this.cdr.markForCheck();
        },
        error: err => {
          this.updatingShareId = null;
          this.toast.error(String(err?.error?.error ?? 'No se pudo actualizar el permiso.'));
          this.cdr.markForCheck();
        }
      });
    });
  }

  revoke(item: InventoryShare): void {
    if (!this.canManageAccess) return;
    this.confirms.confirm({
      title:'Revocar acceso',
      message:`¿Revocar el acceso de «${item.username || 'este usuario'}» al inventario compartido?`,
      confirmLabel:'Revocar acceso',tone:'danger',icon:'person_remove'
    }).subscribe(confirmed=>{
      if(!confirmed || !this.canManageAccess)return;
      this.api.revoke(item.id).subscribe({
        next: () => {this.toast.success('Acceso revocado.');this.loadShares();},
        error: err => this.toast.error(String(err?.error?.error ?? 'No se pudo revocar.'))
      });
    });
  }
}
