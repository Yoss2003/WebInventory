import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventories';
import { MatIconModule } from '@angular/material/icon';
import { LoadingIndicatorComponent } from '../../shared/loading/loading-indicator';
import { UiPageHeadingComponent } from '../../shared/ui/components/ui-page-heading.component';
import { UiSearchComponent } from '../../shared/ui/components/ui-search.component';
import { UiEmptyStateComponent } from '../../shared/ui/components/ui-empty-state.component';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { UiTableActionDirective } from '../../shared/ui/directives/ui-table-action.directive';
import { ToastService } from '../../shared/toast/toast.service';
import { AccessService } from '../../core/services/access';
import { ModalStandardService } from '../../shared/ui/services/modal-standard.service';
import { MasterInventoryDetailDialogComponent } from './master-inventory-detail-dialog/master-inventory-detail-dialog';

interface MasterInventory {
  id: number;
  companyId: number;
  companyName: string;
  inventoryName: string;
  alias?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-master-inventories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    LoadingIndicatorComponent,
    UiPageHeadingComponent,
    UiSearchComponent,
    UiEmptyStateComponent,
    UiButtonDirective,
    UiTableActionDirective
  ],
  templateUrl: './master-inventories.html',
  styleUrl: './master-inventories.scss'
})
export class MasterInventoriesComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  private readonly access = inject(AccessService);
  private readonly modalStandards = inject(ModalStandardService);

  loading = false;
  hasLoaded = false;
  isDeveloper = false;
  companyId = 0;
  query = '';
  masters: MasterInventory[] = [];
  error = '';

  get filtered(): MasterInventory[] {
    const query = this.query.trim().toLocaleLowerCase('es');
    return this.masters.filter(master =>
      !query ||
      [master.companyName, master.inventoryName, String(master.companyId)]
        .some(value => value.toLocaleLowerCase('es').includes(query))
    );
  }

  ngOnInit(): void {
    this.access.me().subscribe({
      next: info => {
        this.isDeveloper = info.isDeveloper || info.roleId === 1;
        this.companyId = info.companyId;
        this.cdr.markForCheck();
        if (this.isDeveloper) this.load();
        else this.error = 'Inventarios maestros es una vista exclusiva del desarrollador.';
      },
      error: () => {
        this.error = 'No se pudieron comprobar los permisos de la sesión.';
        this.cdr.markForCheck();
      }
    });
  }

  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.inventoryService.getMasters().subscribe({
      next: items => {
        this.masters = Array.isArray(items) ? items as MasterInventory[] : [];
        if (!Array.isArray(items)) this.error = 'La API devolvió un listado con formato inesperado.';
        this.loading = false;
        this.hasLoaded = true;
        this.cdr.markForCheck();
      },
      error: error => {
        this.loading = false;
        this.hasLoaded = true;
        this.error = String(error?.error?.error || 'No se pudieron cargar los inventarios maestros.');
        this.toast.error(this.error);
        this.cdr.markForCheck();
      }
    });
  }

  trackByMasterId(_index: number, master: MasterInventory): number {
    return master.id;
  }

  inspect(master: MasterInventory): void {
    this.modalStandards.open(MasterInventoryDetailDialogComponent, 'detail', {
      data: {
        master,
        currentCompanyId: this.companyId
      },
      width: 'min(860px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 28px)',
      panelClass: ['inv-v2-dialog-panel', 'inv-seven-modal'],
      autoFocus: 'first-tabbable',
      restoreFocus: true
    });
  }
}
