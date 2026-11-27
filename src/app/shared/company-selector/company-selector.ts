import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { CompanyPublic } from '../../core/models/company-public.model';
import { MatSelectModule } from '@angular/material/select';
import { UiSelectComponent, UiSelectValue } from '../ui/components/ui-select/ui-select.component';

@Component({
  selector: 'app-company-selector', standalone: true,
  imports: [CommonModule, MatSelectModule, UiSelectComponent],
  template: `
    <app-ui-select [id]="selectId()" ariaLabel="Empresa / sucursal" [value]="value()"
      [disabled]="disabled() || loading() || !companies().length"
      [placeholder]="loading() ? 'Consultando empresas…' : 'Seleccionar empresa'"
      (valueChange)="selectCompany($event)">
      <mat-option *ngFor="let company of companies(); trackBy: trackCompany" [value]="company.id">
        {{ company.businessName }}<span *ngIf="duplicate(company)"> (ID {{ company.id }})</span>
      </mat-option>
    </app-ui-select>`,
  styles: [':host { display: block; min-width: 0; } .inventory-select { width: 100%; }']
})
export class CompanySelectorComponent {
  readonly companies = input<CompanyPublic[]>([]);
  readonly value = input<number | null>(null);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly selectId = input('company-selector');
  readonly valueChange = output<number>();

  selectCompany(value: UiSelectValue): void {
    if (typeof value === 'number') this.valueChange.emit(value);
  }

  private readonly duplicateNames = computed(() => {
    const counts = new Map<string, number>();
    for (const company of this.companies()) {
      const key = this.normalizeName(company.businessName);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
  });

  readonly trackCompany = (_index: number, company: CompanyPublic): number => company.id;

  duplicate(company: CompanyPublic): boolean {
    return this.duplicateNames().has(this.normalizeName(company.businessName));
  }

  private normalizeName(value: string): string {
    return value.trim().toLocaleLowerCase('es');
  }
}
