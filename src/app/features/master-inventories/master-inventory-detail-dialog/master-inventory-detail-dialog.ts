import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { InventoryService } from '../../../core/services/inventories';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';

interface MasterCatalogPreview {
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
  styleUrl: './master-inventory-detail-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterInventoryDetailDialogComponent implements OnInit {
  readonly data: MasterInventoryDetailData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MasterInventoryDetailDialogComponent>);
  private readonly inventoryService = inject(InventoryService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  error = '';
  catalog: MasterCatalogPreview = {
    categories: [],
    brands: [],
    suppliers: []
  };

  get sameCompany(): boolean {
    return this.data.master.companyId === this.data.currentCompanyId;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading) return;
    if (!this.data.master?.id || this.data.master.id <= 0) {
      this.error = 'No se identificó un inventario maestro válido.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    this.inventoryService.getMasterCatalogs(this.data.master.id).pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: value => {
        const result = value as Partial<MasterCatalogPreview> | null;
        this.catalog = {
          categories: Array.isArray(result?.categories) ? result.categories : [],
          brands: Array.isArray(result?.brands) ? result.brands : [],
          suppliers: Array.isArray(result?.suppliers) ? result.suppliers : []
        };
        this.cdr.markForCheck();
      },
      error: err => {
        this.error = err?.name === 'TimeoutError'
          ? 'La consulta del catálogo tardó demasiado. Puedes volver a intentarlo.'
          : String(err?.error?.error || 'No se pudo consultar el catálogo de este inventario.');
        this.cdr.markForCheck();
      }
    });
  }

  close(): void { this.dialogRef.close(); }
}
