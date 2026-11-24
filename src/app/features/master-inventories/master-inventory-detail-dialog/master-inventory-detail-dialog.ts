import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { InventoryService } from '../../../core/services/inventories';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';

interface MasterCatalogPreview {
  id: number;
  companyId: number;
  inventoryName: string;
  categories: { id: number; name: string; parentCategoryId?: number | null }[];
  brands: { id: number; name: string; categoryId: number }[];
  suppliers: { id: number; ruc: string; businessName: string }[];
}

interface MasterInventoryDetailData {
  master: {
    id: number;
    companyId: number;
    companyName: string;
    inventoryName: string;
    alias?: string;
    isActive: boolean;
  };
  currentCompanyId: number;
}

@Component({
  selector: 'app-master-inventory-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, LoadingIndicatorComponent, UiButtonDirective, ModalShellComponent],
  templateUrl: './master-inventory-detail-dialog.html',
  styleUrl: './master-inventory-detail-dialog.scss'
})
export class MasterInventoryDetailDialogComponent implements OnInit {
  readonly data: MasterInventoryDetailData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MasterInventoryDetailDialogComponent>);
  private readonly inventoryService = inject(InventoryService);

  loading = true;
  error = '';
  catalog: MasterCatalogPreview | null = null;

  get sameCompany(): boolean {
    return this.data.master.companyId === this.data.currentCompanyId;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    if (!this.data.master?.id) {
      this.loading = false;
      this.error = 'No se identificó un inventario maestro válido.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.inventoryService.getMasterCatalogs(this.data.master.id).pipe(
      timeout({ first: 15000 }),
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: value => {
        const result = value as MasterCatalogPreview;
        this.catalog = {
          ...result,
          categories: Array.isArray(result?.categories) ? result.categories : [],
          brands: Array.isArray(result?.brands) ? result.brands : [],
          suppliers: Array.isArray(result?.suppliers) ? result.suppliers : []
        };
      },
      error: err => {
        this.error = err?.name === 'TimeoutError'
          ? 'La consulta del catálogo tardó demasiado. Puedes volver a intentarlo.'
          : String(err?.error?.error || 'No se pudo consultar el catálogo de este inventario.');
      }
    });
  }

  close(): void { this.dialogRef.close(); }
}
