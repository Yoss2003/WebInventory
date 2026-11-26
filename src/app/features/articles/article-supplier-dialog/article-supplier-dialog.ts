import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../shared/toast/toast.service';
import type { ToastType } from '../../../shared/toast/toast.service';
import {
  ArticleReferenceDataService, ArticleSupplierReference
} from '../../../core/services/article-reference-data';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import type { ModalActionId, ModalFooterAction } from '../../../shared/ui/models/modal-standard.model';

export interface ArticleSupplierDialogData {
  masterInventoryId: number;
  supplier?: ArticleSupplierReference | null;
}

@Component({
  selector: 'app-article-supplier-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, UiButtonDirective, UiControlDirective, ModalShellComponent],
  templateUrl: './article-supplier-dialog.html',
  styleUrl: './article-supplier-dialog.scss'
})
export class ArticleSupplierDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ArticleReferenceDataService);
  private readonly toasts = inject(ToastService);
  readonly dialogRef = inject(MatDialogRef<ArticleSupplierDialogComponent, ArticleSupplierReference | undefined>);
  readonly data: ArticleSupplierDialogData = inject(MAT_DIALOG_DATA);

  lookingUpRuc = false;
  saving = false;
  fiscalStatus: string | null = null;
  fiscalCondition: string | null = null;

  readonly form = this.fb.nonNullable.group({
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    businessName: ['', [Validators.required, Validators.maxLength(250)]],
    contactName: ['', Validators.maxLength(150)],
    phone: ['', Validators.maxLength(50)],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    address: ['', Validators.maxLength(500)],
    relationshipDescription: ['', Validators.maxLength(700)]
  });

  get editing(): boolean { return !!this.data.supplier?.id; }

  private notify(message: string, type: ToastType, title: string, durationMs = 5000): void {
    this.toasts.show(message, type, title, durationMs);
  }

  constructor() {
    const current = this.data.supplier;
    if (current) {
      this.form.patchValue({
        ruc: current.ruc || '',
        businessName: current.businessName || '',
        contactName: current.contactName || '',
        phone: current.phone || '',
        email: current.email || '',
        address: current.address || '',
        relationshipDescription: current.relationshipDescription || ''
      });
      this.fiscalStatus = current.estado || null;
      this.fiscalCondition = current.condicion || null;
    }
  }

  get modalFooterActions(): ModalFooterAction[] {
    return [
      { id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 0, disabled: this.saving || this.lookingUpRuc },
      { id: 'primary', label: this.editing ? 'Guardar cambios' : 'Registrar proveedor', tone: 'primary', order: 1, disabled: this.saving || this.lookingUpRuc || this.form.invalid }
    ];
  }

  handleModalAction(action: ModalActionId): void {
    if (action === 'cancel') this.close();
    if (action === 'primary') this.save();
  }

  lookupRuc(): void {
    const ruc = this.form.controls.ruc.value.trim();
    if (!/^\d{11}$/.test(ruc) || this.lookingUpRuc || this.saving) return;
    this.lookingUpRuc = true;
    this.api.lookupSupplierRuc(ruc).subscribe({
      next: result => {
        this.lookingUpRuc = false;
        if (this.form.controls.ruc.value.trim() !== ruc) return;
        this.form.patchValue({
          businessName: result.businessName || this.form.controls.businessName.value,
          address: result.address || this.form.controls.address.value
        });
        this.fiscalStatus = result.estado || null;
        this.fiscalCondition = result.condicion || null;
        if (result.lookupFromCache) {
          this.notify('La consulta usó datos guardados previamente en esta empresa.', 'info', 'Consulta fiscal', 4500);
        } else {
          this.notify('Datos fiscales consultados. Revisa y completa el contacto.', 'success', 'Consulta fiscal', 3500);
        }
      },
      error: error => {
        this.lookingUpRuc = false;
        this.notify(String(error?.error?.error || 'No se pudo consultar el RUC. Puedes completar los datos manualmente.'), 'error', 'Consulta de RUC', 5500);
      }
    });
  }

  save(): void {
    if (this.saving || this.lookingUpRuc) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (!this.editing && this.data.masterInventoryId <= 0) {
      this.notify('No se encontró el inventario maestro de la empresa.', 'warning', 'Inventario maestro', 4500);
      return;
    }

    const raw = this.form.getRawValue();
    const supplier: Partial<ArticleSupplierReference> = {
      ...(this.data.supplier || {}),
      ruc: raw.ruc.trim(),
      businessName: raw.businessName.trim(),
      contactName: raw.contactName.trim() || null,
      phone: raw.phone.trim() || null,
      email: raw.email.trim() || null,
      address: raw.address.trim() || null,
      relationshipDescription: raw.relationshipDescription.trim() || null,
      statusId: this.data.supplier?.statusId || 1,
      estado: this.fiscalStatus,
      condicion: this.fiscalCondition,
      isActive: true
    };

    this.saving = true;
    const existing = this.data.supplier;
    if (this.editing && existing) {
      this.api.updateSupplier(existing.id, supplier).subscribe({
        next: () => {
          this.saving = false;
          this.notify('Proveedor actualizado.', 'success', 'Proveedor actualizado', 3000);
          this.dialogRef.close({ ...existing, ...supplier, id: existing.id } as ArticleSupplierReference);
        },
        error: error => {
          this.saving = false;
          this.notify(String(error?.error?.error || 'No se pudo actualizar el proveedor.'), 'error', 'Actualización de proveedor', 5500);
        }
      });
      return;
    }

    this.api.createSupplier({ ...supplier, inventoryId: this.data.masterInventoryId }).subscribe({
      next: result => {
        this.saving = false;
        this.notify(result.reused ? 'El proveedor ya existía; se reutilizó su registro.' : 'Proveedor registrado en el catálogo maestro.', result.reused ? 'info' : 'success', result.reused ? 'Proveedor existente' : 'Proveedor registrado', 3500);
        this.dialogRef.close(result);
      },
      error: error => {
        this.saving = false;
        this.notify(String(error?.error?.error || 'No se pudo registrar el proveedor.'), 'error', 'Registro de proveedor', 5500);
      }
    });
  }

  close(): void {
    if (!this.saving && !this.lookingUpRuc) this.dialogRef.close();
  }
}
