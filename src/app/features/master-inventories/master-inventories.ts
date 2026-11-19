import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventories';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LoadingIndicatorComponent } from '../../shared/loading/loading-indicator';
import { UiPageHeadingComponent } from '../../shared/ui/components/ui-page-heading.component';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { UiTableActionDirective } from '../../shared/ui/directives/ui-table-action.directive';
import { ToastService } from '../../shared/toast/toast.service';
import { AccessService } from '../../core/services/access';

interface MasterInventory {
  id: number;
  companyId: number;
  companyName: string;
  inventoryName: string;
  alias?: string;
  isActive: boolean;
}

interface CatalogPreview {
  id: number;
  companyId: number;
  inventoryName: string;
  categories: { id: number; name: string; parentCategoryId?: number | null }[];
  brands: { id: number; name: string; categoryId: number }[];
  suppliers: { id: number; ruc: string; businessName: string }[];
}

@Component({
  selector: 'app-master-inventories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    RouterLink,
    LoadingIndicatorComponent,
    UiPageHeadingComponent,
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

  loading = false;
  hasLoaded = false;
  loadingCatalog = false;
  isDeveloper = false;
  companyId = 0;
  query = '';
  masters: MasterInventory[] = [];
  selected: MasterInventory | null = null;
  catalog: CatalogPreview | null = null;
  error = '';

  get filtered(): MasterInventory[] {
    const q = this.query.trim().toLocaleLowerCase('es');
    return this.masters.filter(m =>
      !q ||
      [m.companyName, m.inventoryName, String(m.companyId)]
        .some(v => v.toLocaleLowerCase('es').includes(q))
    );
  }

  get sameCompany(): boolean {
    return this.selected !== null && this.selected.companyId === this.companyId;
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
        this.masters = Array.isArray(items) ? (items as MasterInventory[]) : [];
        if (!Array.isArray(items)) this.error = 'La API devolvió un listado con formato inesperado.';
        this.loading = false;
        this.hasLoaded = true;
        if (this.selected) {
          this.selected = this.masters.find(x => x.id === this.selected?.id) || null;
          if (!this.selected) this.catalog = null;
        }
        if (!this.selected && this.masters.length === 1) this.inspect(this.masters[0]);
        this.cdr.markForCheck();
      },
      error: e => {
        this.loading = false;
        this.hasLoaded = true;
        this.error = String(e?.error?.error || 'No se pudieron cargar los inventarios maestros.');
        this.toast.error(this.error);
        this.cdr.markForCheck();
      }
    });
  }

  trackByMasterId(_index: number, master: MasterInventory): number {
    return master.id;
  }

  inspect(master: MasterInventory): void {
    this.selected = master;
    this.catalog = null;
    this.loadingCatalog = true;
    this.cdr.markForCheck();
    this.inventoryService.getMasterCatalogs(master.id).subscribe({
      next: value => {
        this.catalog = value as CatalogPreview;
        this.loadingCatalog = false;
        this.cdr.markForCheck();
      },
      error: e => {
        this.loadingCatalog = false;
        this.toast.error(String(e?.error?.error || 'No se pudo consultar el catálogo.'));
        this.cdr.markForCheck();
      }
    });
  }
}