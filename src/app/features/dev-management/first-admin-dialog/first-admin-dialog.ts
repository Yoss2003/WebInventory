import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DevManagementService } from '../../../core/services/dev-management';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ExternalConsultasService } from '../../../core/services/external-consultas';
import { ManagedRole, UserManagementService } from '../../../core/services/user-management';
import { suggestedUsername } from '../../../shared/user-name';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';
import { Observable } from 'rxjs';

export interface FirstAdminDialogData {
  companyId: number;
  companyName: string;
  firstAdministrator?: boolean;
  roles?: ManagedRole[];
}

export interface FirstAdminCreated {
  id: number;
  username: string;
  personalInventoryId: number;
  emailSent: boolean;
  message?: string;
}

@Component({
  selector: 'app-first-admin-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    UiButtonDirective,
    UiControlDirective
  ],
  templateUrl: './first-admin-dialog.html',
  styleUrl: './first-admin-dialog.scss'
})
export class FirstAdminDialogComponent {
  readonly data = inject<FirstAdminDialogData>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialogRef<FirstAdminDialogComponent, FirstAdminCreated | null>);
  private readonly devManagementService = inject(DevManagementService);
  private readonly users = inject(UserManagementService);
  private readonly external = inject(ExternalConsultasService);
  private readonly cdr = inject(ChangeDetectorRef);

  firstName = '';
  lastName = '';
  username = '';
  email = '';
  dni = '';
  roleId = 0;
  saving = false;
  lookingUpDni = false;
  error = '';
  dniMessage = '';

  get isFirstAdmin(): boolean {
    return this.data.firstAdministrator !== false;
  }

  get availableRoles(): ManagedRole[] {
    return (this.data.roles || []).filter(r => r.id > 2);
  }

  get chosenRole(): number {
    return this.isFirstAdmin ? 2 : this.roleId;
  }

  get valid(): boolean {
    return !this.saving &&
      !!this.firstName.trim() &&
      !!this.lastName.trim() &&
      this.username.length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()) &&
      (!this.dni || /^\d{8}$/.test(this.dni)) &&
      (this.isFirstAdmin || this.availableRoles.some(r => r.id === this.roleId));
  }

  constructor() {
    if (this.isFirstAdmin) this.roleId = 2;
    else this.roleId = this.availableRoles[0]?.id ?? 0;
  }

  onNamesChanged(): void {
    this.username = suggestedUsername(this.firstName, this.lastName);
  }

  consultDni(): void {
    if (!/^\d{8}$/.test(this.dni) || this.saving || this.lookingUpDni) return;
    this.lookingUpDni = true;
    this.dniMessage = '';
    this.external.dni(this.dni).subscribe({
      next: data => {
        const first = (data.first_name || '').trim();
        const last = [data.first_last_name, data.second_last_name].filter(Boolean).join(' ').trim();
        if (first) this.firstName = first;
        if (last) this.lastName = last;
        this.onNamesChanged();
        this.lookingUpDni = false;
        this.dniMessage = first && last
          ? 'Los nombres se completaron con los datos devueltos por RENIEC.'
          : 'No se devolvieron todos los nombres. Completa los datos manualmente.';
        this.cdr.markForCheck();
      },
      error: err => {
        this.lookingUpDni = false;
        this.dniMessage = String(err?.error?.error || 'No se pudo consultar RENIEC. Puedes continuar manualmente.');
        this.cdr.markForCheck();
      }
    });
  }

  close(): void {
    if (!this.saving) this.dialog.close(null);
  }

  save(): void {
    if (!this.valid) return;
    this.saving = true;
    this.error = '';
    const payload = {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      username: this.username,
      email: this.email.trim(),
      dni: this.dni.trim() || null,
      roleId: this.chosenRole
    };
    const request$ = (this.isFirstAdmin
      ? this.devManagementService.createFirstAdmin(this.data.companyId, payload)
      : this.users.create(payload)) as Observable<FirstAdminCreated>;

    request$.subscribe({
      next: created => {
        this.saving = false;
        this.dialog.close(created);
      },
      error: err => {
        this.saving = false;
        this.error = String(
          err?.error?.error ||
          err?.error?.message ||
          'No se pudo registrar. Verifica SMTP, rol y los detalles de la API.'
        );
        this.cdr.markForCheck();
      }
    });
  }
}