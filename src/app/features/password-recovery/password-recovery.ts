import { UiButtonDirective } from '../../shared/ui/directives/ui-button.directive';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompanyPublicService } from '../../core/services/companies';
import { CompanySelectorComponent } from '../../shared/company-selector/company-selector';
import { CompanyPublic } from '../../core/models/company-public.model';
@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [
    UiButtonDirective,
    CommonModule,
    FormsModule,
    RouterModule,
    CompanySelectorComponent
  ],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.scss'
})
export class PasswordRecoveryComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly companiesApi = inject(CompanyPublicService);
  private readonly cdr = inject(ChangeDetectorRef);

  loadingCompanies = false;
  companiesError = '';
  companies: CompanyPublic[] = [];
  companyId: number | null = null;
  username = '';
  token = '';
  password = '';
  confirmPassword = '';
  sending = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.loadCompanies();
  }

  loadCompanies(): void {
    if (this.loadingCompanies || this.sending) return;
    this.loadingCompanies = true;
    this.companiesError = '';
    this.cdr.markForCheck();
    this.companiesApi.getActiveCompanies().subscribe({
      next: data => {
        this.companies = data;
        this.companyId = data.some(c => c.id === this.companyId)
          ? this.companyId
          : (data.length === 1 ? data[0].id : null);
        this.loadingCompanies = false;
        if (!data.length) this.companiesError = 'No hay empresas activas disponibles.';
        this.cdr.markForCheck();
      },
      error: () => {
        this.companies = [];
        this.companyId = null;
        this.loadingCompanies = false;
        this.companiesError = 'No fue posible consultar empresas. Vuelve a intentar.';
        this.cdr.markForCheck();
      }
    });
  }

  submit(): void {
    if (this.sending || this.loadingCompanies) return;
    this.error = '';
    this.message = '';

    if (this.token && (this.password.length < 12 || this.password !== this.confirmPassword)) {
      this.error = 'Utiliza al menos 12 caracteres y confirma la contraseña.';
      return;
    }

    const selectedCompanyId = this.companyId;
    if (!this.token && (selectedCompanyId === null || !this.companies.some(c => c.id === selectedCompanyId) || !this.username.trim())) {
      this.error = 'Selecciona tu empresa e indica tu usuario o correo.';
      return;
    }

    this.sending = true;
    this.cdr.markForCheck();

    const request$ = this.token
      ? this.authService.completeInitialPassword(this.token, this.password)
      : this.authService.requestPasswordRecovery(selectedCompanyId!, this.username.trim());

    request$.subscribe({
      next: r => {
        this.sending = false;
        this.message = r.message;
        this.password = '';
        this.confirmPassword = '';
        this.token = '';
        this.cdr.markForCheck();
      },
      error: e => {
        this.sending = false;
        this.error = String(e?.error?.error || 'No fue posible procesar la solicitud.');
        this.cdr.markForCheck();
      }
    });
  }
}