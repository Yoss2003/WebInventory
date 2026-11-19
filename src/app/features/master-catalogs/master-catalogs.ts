import { UiControlDirective } from '../../shared/ui/directives/ui-control.directive';
import { UiTableActionDirective } from '../../shared/ui/directives/ui-table-action.directive';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { UiPageHeadingComponent } from '../../shared/ui/components/ui-page-heading.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { SupplierDetailDialogComponent } from './supplier-detail-dialog';
import { ConfirmationDialogService } from '../../shared/confirm-dialog/confirmation-dialog.service';
import { InventoryContextService } from '../../core/services/inventory-context';
import { MasterCatalogsService } from '../../core/services/master-catalogs';
import { ToastService } from '../../shared/toast/toast.service';
import { UiSearchComponent } from '../../shared/ui/components/ui-search.component';
import { UiEmptyStateComponent } from '../../shared/ui/components/ui-empty-state.component';
import { UiStatusComponent } from '../../shared/ui/components/ui-status.component';
import { LoadingIndicatorComponent } from '../../shared/loading/loading-indicator';

export interface SupplierRecord {
  id: number;
  inventoryId: number;
  companyId: number;
  ruc: string;
  businessName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  statusId: number;
  isActive: boolean;
  reused?: boolean;
  relationshipDescription?: string | null;
  fiscalDataJson?: string | null;
  estado?: string | null;
  condicion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  advancedDataAvailable?: boolean;
  lookupFromCache?: boolean;
  ubigeo?: string | null;
  tipoContribuyente?: string | null;
  actividadEconomica?: string | null;
  numeroTrabajadores?: string | null;
  tipoFacturacion?: string | null;
  tipoContabilidad?: string | null;
  comercioExterior?: string | null;
}

interface ParameterRecord {
  id: number;
  inventoryId: number;
  companyId: number;
  parameterType: string;
  name: string;
  description?: string | null;
  reused?: boolean;
}

@Component({
  selector: 'app-master-catalogs',
  standalone: true,
  imports: [
    LoadingIndicatorComponent,
    UiControlDirective,
    UiTableActionDirective,
    UiButtonDirective,
    UiPageHeadingComponent,
    UiEmptyStateComponent,
    UiStatusComponent,
    CommonModule,
    FormsModule,
    MatIconModule,
    UiSearchComponent
  ],
  templateUrl: './master-catalogs.html',
  styleUrl: './master-catalogs.scss'
})
export class MasterCatalogsComponent implements OnInit {
  private readonly masterCatalogsApi = inject(MasterCatalogsService);
  private readonly inventories = inject(InventoryContextService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly confirms = inject(ConfirmationDialogService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  tab: 'suppliers' | 'parameters' = 'suppliers';
  suppliers: SupplierRecord[] = [];
  parameters: ParameterRecord[] = [];
  supplierSearch = '';
  parameterSearch = '';

  get filteredSuppliers(): SupplierRecord[] {
    const q = this.supplierSearch.trim().toLocaleLowerCase('es');
    return !q
      ? this.suppliers
      : this.suppliers.filter(x =>
          [x.ruc, x.businessName, x.contactName, x.email, x.estado]
            .some(value => String(value ?? '').toLocaleLowerCase('es').includes(q))
        );
  }

  get filteredParameters(): ParameterRecord[] {
    const q = this.parameterSearch.trim().toLocaleLowerCase('es');
    return !q
      ? this.parameters
      : this.parameters.filter(x =>
          [x.parameterType, x.name, x.description]
            .some(value => String(value ?? '').toLocaleLowerCase('es').includes(q))
        );
  }

  loading = false;
  saving = false;
  lookupRucLoading = false;
  advancedInfo: Partial<SupplierRecord> | null = null;
  editingSupplierId: number | null = null;
  editingParameterId: number | null = null;
  supplier: SupplierRecord = this.emptySupplier();
  parameter: ParameterRecord = this.emptyParameter();

  get canManage(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      return [1, 2].includes(Number(JSON.parse(localStorage.getItem('userSession') || '{}').roleId));
    } catch {
      return false;
    }
  }

  ngOnInit(): void {
    this.refresh();
  }

  private emptySupplier(): SupplierRecord {
    return {
      id: 0,
      inventoryId: 0,
      companyId: 0,
      ruc: '',
      businessName: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      relationshipDescription: '',
      fiscalDataJson: null,
      statusId: 1,
      isActive: true
    };
  }

  private emptyParameter(): ParameterRecord {
    return { id: 0, inventoryId: 0, companyId: 0, parameterType: '', name: '', description: '' };
  }

  refresh(): void {
    if (this.loading) return;
    this.loading = true;
    this.masterCatalogsApi.getSuppliers<SupplierRecord>().subscribe({
      next: list => {
        this.suppliers = list || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.toast.error('No se pudieron consultar los proveedores.');
        this.cdr.markForCheck();
      }
    });
    this.masterCatalogsApi.getParameters<ParameterRecord>().subscribe({
      next: list => {
        this.parameters = list || [];
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('No se pudieron consultar los parámetros generales.')
    });
  }

  lookupRuc(): void {
    const ruc = String(this.supplier.ruc ?? '').trim();
    if (!/^\d{11}$/.test(ruc)) {
      this.toast.warning('El RUC debe tener 11 dígitos.');
      return;
    }
    if (this.lookupRucLoading || this.saving) return;
    this.lookupRucLoading = true;
    this.advancedInfo = null;
    this.cdr.markForCheck();
    this.masterCatalogsApi.lookupSupplierByRuc<Partial<SupplierRecord>>(ruc).subscribe({
      next: result => {
        this.lookupRucLoading = false;
        if (String(this.supplier.ruc).trim() !== ruc) {
          this.cdr.markForCheck();
          return;
        }
        this.supplier = {
          ...this.supplier,
          businessName: result.businessName || this.supplier.businessName,
          address: result.address?.trim() || this.supplier.address,
          statusId: result.statusId || this.supplier.statusId,
          estado: result.estado ?? this.supplier.estado,
          condicion: result.condicion ?? this.supplier.condicion,
          distrito: result.distrito ?? this.supplier.distrito,
          provincia: result.provincia ?? this.supplier.provincia,
          departamento: result.departamento ?? this.supplier.departamento,
          fiscalDataJson: result.fiscalDataJson ?? this.supplier.fiscalDataJson
        };
        this.advancedInfo = result.advancedDataAvailable ? result : null;
        if (result.lookupFromCache)
          this.toast.warning('Decolecta no respondió. Se mostraron datos previamente guardados en esta empresa.', 'Datos en caché');
        else if (result.advancedDataAvailable)
          this.toast.success('Consulta avanzada realizada. Revisa la información fiscal y completa los datos de contacto.', 'Datos SUNAT');
        else
          this.toast.info('La consulta básica funcionó, pero la avanzada no está disponible con este acceso.', 'Datos SUNAT');
        this.cdr.markForCheck();
      },
      error: err => {
        this.lookupRucLoading = false;
        this.toast.error(String(err?.error?.error ?? 'No se pudo consultar el RUC en Decolecta.'));
        this.cdr.markForCheck();
      }
    });
  }

  newSupplier(): void {
    this.supplier = this.emptySupplier();
    this.editingSupplierId = null;
    this.advancedInfo = null;
  }

  showSupplierDetail(item: SupplierRecord): void {
    this.dialog.open(SupplierDetailDialogComponent, {
      data: { ...item },
      panelClass: 'inv-seven-modal',
      enterAnimationDuration: 260,
      exitAnimationDuration: 220,
      width: 'min(760px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 24px)',
      autoFocus: false,
      restoreFocus: true
    });
  }

  editSupplier(item: SupplierRecord): void {
    if (!this.canManage) return;
    this.advancedInfo = null;
    this.supplier = { ...item };
    this.editingSupplierId = item.id;
    this.tab = 'suppliers';
  }

  saveSupplier(): void {
    const ruc = String(this.supplier.ruc).trim();
    const businessName = String(this.supplier.businessName).trim();
    if (!/^\d{11}$/.test(ruc) || !businessName) {
      this.toast.warning('Ingresa un RUC de 11 dígitos y la razón social.');
      return;
    }
    const inventoryId = this.inventories.activeInventoryId;
    if (!inventoryId) {
      this.toast.warning('Selecciona un inventario personal o compartido.');
      return;
    }
    this.saving = true;
    const payload = { ...this.supplier, ruc, businessName, inventoryId };
    this.masterCatalogsApi.saveSupplier<SupplierRecord>(payload, this.editingSupplierId).subscribe({
      next: item => {
        this.saving = false;
        if (item && typeof item === 'object' && 'reused' in item && item.reused)
          this.toast.info('El proveedor ya estaba registrado. Se reutilizó el mismo ID.', 'Proveedor existente');
        else
          this.toast.success(this.editingSupplierId ? 'Proveedor actualizado.' : 'Proveedor incorporado al catálogo maestro.');
        this.newSupplier();
        this.refresh();
      },
      error: err => {
        this.saving = false;
        this.toast.error(String(err?.error?.error || 'No fue posible guardar el proveedor.'));
      }
    });
  }

  disableSupplier(item: SupplierRecord): void {
    if (!this.canManage || !item.isActive) return;
    this.confirms.confirm({
      title: 'Desactivar proveedor',
      message: `¿Desactivar «${item.businessName}»? Sus datos e historial se conservarán.`,
      confirmLabel: 'Desactivar',
      tone: 'danger',
      icon: 'block'
    }).subscribe(confirmed => {
      if (!confirmed || !this.canManage || !item.isActive) return;
      this.masterCatalogsApi.deleteSupplier(item.id).subscribe({
        next: () => {
          this.toast.success('Proveedor desactivado.');
          this.refresh();
        },
        error: err => this.toast.error(String(err?.error?.error || 'No se pudo desactivar el proveedor.'))
      });
    });
  }

  newParameter(): void {
    this.parameter = this.emptyParameter();
    this.editingParameterId = null;
  }

  editParameter(item: ParameterRecord): void {
    if (!this.canManage) return;
    this.parameter = { ...item };
    this.editingParameterId = item.id;
    this.tab = 'parameters';
  }

  saveParameter(): void {
    if (!this.parameter.parameterType.trim() || !this.parameter.name.trim()) {
      this.toast.warning('Indica el tipo y el nombre del parámetro.');
      return;
    }
    const inventoryId = this.inventories.activeInventoryId;
    if (!inventoryId) {
      this.toast.warning('Selecciona un inventario de trabajo.');
      return;
    }
    this.saving = true;
    const payload = { ...this.parameter, inventoryId };
    this.masterCatalogsApi.saveParameter<ParameterRecord>(payload, this.editingParameterId).subscribe({
      next: item => {
        this.saving = false;
        if (item && typeof item === 'object' && 'reused' in item && item.reused)
          this.toast.info('Este parámetro ya existe. Se reutilizó su ID.', 'Parámetro existente');
        else
          this.toast.success(this.editingParameterId ? 'Parámetro actualizado.' : 'Parámetro creado en el maestro.');
        this.newParameter();
        this.refresh();
      },
      error: err => {
        this.saving = false;
        this.toast.error(String(err?.error?.error || 'No fue posible guardar el parámetro.'));
      }
    });
  }

  deleteParameter(item: ParameterRecord): void {
    if (!this.canManage) return;
    this.confirms.confirm({
      title: 'Eliminar parámetro',
      message: `¿Eliminar «${item.name}»? Comprueba que ningún proceso dependa de este parámetro.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
      icon: 'delete_outline'
    }).subscribe(confirmed => {
      if (!confirmed || !this.canManage) return;
      this.masterCatalogsApi.deleteParameter(item.id).subscribe({
        next: () => {
          this.toast.success('Parámetro eliminado.');
          this.refresh();
        },
        error: err => this.toast.error(String(err?.error?.error || 'No se pudo eliminar el parámetro.'))
      });
    });
  }

  switchCatalogTab(tab: 'suppliers' | 'parameters'): void {
    if (this.tab === tab) return;

    const update = () => {
      this.tab = tab;
      this.cdr.detectChanges();
    };

    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };

    if (doc.startViewTransition) {
      doc.startViewTransition(update);
    } else {
      update();
    }
  }
}