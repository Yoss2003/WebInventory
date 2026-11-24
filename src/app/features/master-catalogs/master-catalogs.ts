import { UiControlDirective } from '../../shared/ui/directives/ui-control.directive';
import { UiTableActionDirective } from '../../shared/ui/directives/ui-table-action.directive';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { UiPageHeadingComponent } from '../../shared/ui/components/ui-page-heading.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModalStandardService } from '../../shared/ui/services/modal-standard.service';
import { SupplierDetailDialogComponent } from './supplier-detail-dialog/supplier-detail-dialog';
import { ConfirmationDialogService } from '../../shared/confirm-dialog/confirmation-dialog.service';
import { InventoryContextService } from '../../core/services/inventory-context';
import { MasterCatalogsService } from '../../core/services/master-catalogs';
import { ToastService } from '../../shared/toast/toast.service';
import { UiSearchComponent } from '../../shared/ui/components/ui-search.component';
import { UiEmptyStateComponent } from '../../shared/ui/components/ui-empty-state.component';
import { UiStatusComponent } from '../../shared/ui/components/ui-status.component';
import { LoadingIndicatorComponent } from '../../shared/loading/loading-indicator';
import { SupplierCommunicationDialogComponent } from './supplier-communication-dialog/supplier-communication-dialog';
import type { SupplierCommunicationData } from './supplier-communication-dialog/supplier-communication-dialog';
import { SupplierFiscalInfoDialogComponent } from './supplier-fiscal-info-dialog/supplier-fiscal-info-dialog';

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
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    UiSearchComponent
  ],
  templateUrl: './master-catalogs.html',
  styleUrl: './master-catalogs.scss'
})
export class MasterCatalogsComponent implements OnInit {
  private readonly masterCatalogsApi = inject(MasterCatalogsService);
  private readonly inventories = inject(InventoryContextService);
  private readonly toast = inject(ToastService);
  private readonly modalStandards = inject(ModalStandardService);
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
    return this.parameters.filter(item => {
      const matchesType = !this.parameterTypeFilter ||
        this.normalizeParameterType(item.parameterType) === this.normalizeParameterType(this.parameterTypeFilter);
      const matchesSearch = !q || [item.parameterType, item.name, item.description]
        .some(value => String(value ?? '').toLocaleLowerCase('es').includes(q));
      return matchesType && matchesSearch;
    });
  }

  private readonly standardParameterTypes = ['Estado', 'Condicion', 'Area', 'TipoContrato', 'PosicionTrabajo', 'Ubicacion'];
  parameterTypeFilter = '';

  get parameterTypeOptions(): string[] {
    const values = [...this.standardParameterTypes];
    const currentType = String(this.parameter.parameterType ?? '').trim();
    const currentKey = this.normalizeParameterType(currentType);
    if (this.editingParameterId && currentType && !this.isSystemManagedType(currentType) &&
        !values.some(value => this.normalizeParameterType(value) === currentKey)) {
      values.push(currentType);
    }
    return values;
  }

  get parameterFilterOptions(): string[] {
    const values = [...this.standardParameterTypes, ...this.parameters.map(item => item.parameterType)];
    const unique = new Map<string, string>();
    for (const value of values) {
      const normalized = this.normalizeParameterType(value);
      if (normalized && !this.isSystemManagedType(value) && !unique.has(normalized)) unique.set(normalized, value.trim());
    }
    return [...unique.values()].sort((a, b) => this.parameterTypeLabel(a).localeCompare(this.parameterTypeLabel(b), 'es'));
  }

  get isSystemManagedParameter(): boolean {
    return this.editingParameterId !== null && this.isSystemManagedType(this.parameter.parameterType);
  }

  parameterTypeLabel(value: string): string {
    const normalized = this.normalizeParameterType(value);
    if (normalized === 'condicion') return 'Condición';
    if (normalized === 'area') return 'Área';
    if (normalized === 'tipocontrato') return 'Tipo de contrato';
    if (normalized === 'posiciontrabajo') return 'Posición de trabajo';
    if (normalized === 'ubicacion') return 'Ubicación';
    return value;
  }

  private normalizeParameterType(value: string): string {
    return String(value ?? '').trim().toLocaleLowerCase('es')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private isSystemManagedType(value: string): boolean {
    return this.normalizeParameterType(value).replace(/[\s_-]+/g, '') === 'monedabase';
  }

  private consultedRuc = '';

  get hasCurrentRucConsultation(): boolean {
    const currentRuc = String(this.supplier.ruc ?? '').trim();
    return /^\d{11}$/.test(currentRuc) && this.consultedRuc === currentRuc;
  }

  get hasSupplierFormData(): boolean {
    return Boolean(this.editingSupplierId ||
      this.supplier.ruc.trim() || this.supplier.businessName.trim() ||
      this.supplier.contactName?.trim() || this.supplier.phone?.trim() ||
      this.supplier.email?.trim() || this.supplier.address?.trim() ||
      this.supplier.relationshipDescription?.trim() || this.supplier.estado?.trim() ||
      this.supplier.distrito?.trim() || this.supplier.provincia?.trim() ||
      this.supplier.departamento?.trim() || this.supplier.fiscalDataJson);
  }

  initialLoading = false;
  refreshing = false;
  private hasLoadedOnce = false;
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
    if (this.refreshing) return;
    this.refreshing = true;
    this.initialLoading = !this.hasLoadedOnce;

    let suppliersFailed = false;
    let parametersFailed = false;

    forkJoin({
      suppliers: this.masterCatalogsApi.getSuppliers<SupplierRecord>().pipe(
        catchError(() => {
          suppliersFailed = true;
          return of(null as SupplierRecord[] | null);
        })
      ),
      parameters: this.masterCatalogsApi.getParameters<ParameterRecord>().pipe(
        catchError(() => {
          parametersFailed = true;
          return of(null as ParameterRecord[] | null);
        })
      )
    }).pipe(finalize(() => {
      this.refreshing = false;
      this.initialLoading = false;
      this.hasLoadedOnce = true;
      this.cdr.markForCheck();
    })).subscribe(({ suppliers, parameters }) => {
      if (suppliers) this.suppliers = suppliers;
      if (parameters) this.parameters = parameters;
      if (suppliersFailed) this.toast.error('No se pudieron consultar los proveedores.');
      if (parametersFailed) this.toast.error('No se pudieron consultar los parámetros generales.');
      this.cdr.markForCheck();
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
    this.consultedRuc = '';
    this.advancedInfo = null;
    this.cdr.markForCheck();
    this.masterCatalogsApi.lookupSupplierByRuc<Partial<SupplierRecord>>(ruc).subscribe({
      next: result => {
        this.lookupRucLoading = false;
        if (String(this.supplier.ruc).trim() !== ruc) {
          this.cdr.markForCheck();
          return;
        }
        this.consultedRuc = ruc;
        this.supplier = {
          ...this.supplier,
          businessName: result.businessName || this.supplier.businessName,
          address: result.address?.trim() || this.supplier.address,
          statusId: result.statusId ?? this.supplier.statusId,
          estado: result.estado ?? null,
          condicion: result.condicion ?? null,
          distrito: result.distrito ?? null,
          provincia: result.provincia ?? null,
          departamento: result.departamento ?? null,
          fiscalDataJson: result.fiscalDataJson ?? null
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
    this.consultedRuc = '';
  }

  openSupplierCommunication(): void {
    const ref = this.modalStandards.open<SupplierCommunicationDialogComponent, SupplierCommunicationData, SupplierCommunicationData>(
      SupplierCommunicationDialogComponent, 'subTask',
      {
        data: {
          contactName: this.supplier.contactName ?? '',
          phone: this.supplier.phone ?? '',
          email: this.supplier.email ?? ''
        },
        panelClass: 'inv-seven-modal',
        ariaLabelledBy: 'supplier-communication-title',
        enterAnimationDuration: 260,
        exitAnimationDuration: 220,
        width: 'min(520px, calc(100vw - 24px))',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 24px)',
        autoFocus: false,
        restoreFocus: true
      }
    );
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.supplier = { ...this.supplier, ...result };
      this.cdr.markForCheck();
    });
  }

  showFiscalInfo(): void {
    if (!this.hasCurrentRucConsultation) return;
    const info: Partial<SupplierRecord> = {
      estado: this.supplier.estado,
      condicion: this.supplier.condicion,
      address: this.supplier.address,
      distrito: this.supplier.distrito,
      provincia: this.supplier.provincia,
      departamento: this.supplier.departamento,
      ...(this.readStoredFiscalInfo() ?? {}),
      ...(this.advancedInfo ?? {})
    };
    this.modalStandards.open(SupplierFiscalInfoDialogComponent, 'informative', {
      data: info,
      panelClass: ['inv-seven-modal', 'inv-modal--wide'],
      ariaLabelledBy: 'supplier-fiscal-title',
      enterAnimationDuration: 260,
      exitAnimationDuration: 220,
      width: 'min(1060px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 24px)',
      autoFocus: false,
      restoreFocus: true
    });
  }

  private readStoredFiscalInfo(): Partial<SupplierRecord> | null {
    try {
      const parsed: unknown = JSON.parse(this.supplier.fiscalDataJson || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const values = parsed as Record<string, unknown>;
      const read = (key: string): string | null => {
        const value = values[key];
        return value == null || value === '' ? null : String(value);
      };
      return {
        tipoContribuyente: read('tipo'),
        actividadEconomica: read('actividad_economica'),
        ubigeo: read('ubigeo'),
        numeroTrabajadores: read('numero_trabajadores'),
        tipoFacturacion: read('tipo_facturacion'),
        tipoContabilidad: read('tipo_contabilidad'),
        comercioExterior: read('comercio_exterior')
      };
    } catch {
      return null;
    }
  }

  showSupplierDetail(item: SupplierRecord): void {
    this.modalStandards.open(SupplierDetailDialogComponent, 'detail', {
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
    this.consultedRuc = '';
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