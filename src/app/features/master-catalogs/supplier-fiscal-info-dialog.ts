import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import type { SupplierRecord } from './master-catalogs';

interface FiscalInfoRow { label: string; value: string; }

@Component({
  selector: 'app-supplier-fiscal-info-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, UiButtonDirective],
  templateUrl: './supplier-fiscal-info-dialog.html',
  styleUrl: './supplier-fiscal-info-dialog.scss'
})
export class SupplierFiscalInfoDialogComponent {
  readonly info = inject<Partial<SupplierRecord>>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SupplierFiscalInfoDialogComponent>>(MatDialogRef);

  readonly rows: FiscalInfoRow[] = [
    { label: 'Estado SUNAT', value: this.info.estado || '—' },
    { label: 'Condición SUNAT', value: this.info.condicion || '—' },
    { label: 'Dirección', value: this.info.address || '—' },
    { label: 'Distrito', value: this.info.distrito || '—' },
    { label: 'Provincia', value: this.info.provincia || '—' },
    { label: 'Departamento', value: this.info.departamento || '—' },
    { label: 'Tipo de contribuyente', value: this.info.tipoContribuyente || '—' },
    { label: 'Actividad económica', value: this.info.actividadEconomica || '—' },
    { label: 'Ubigeo', value: this.info.ubigeo || '—' },
    { label: 'Número de trabajadores', value: this.info.numeroTrabajadores || '—' },
    { label: 'Tipo de facturación', value: this.info.tipoFacturacion || '—' },
    { label: 'Tipo de contabilidad', value: this.info.tipoContabilidad || '—' },
    { label: 'Comercio exterior', value: this.info.comercioExterior || '—' }
  ];

  close(): void {
    this.dialogRef.close();
  }
}
