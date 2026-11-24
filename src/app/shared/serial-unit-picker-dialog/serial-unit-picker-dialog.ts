import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SerialUnit } from '../../core/services/serial-units';
import { UiButtonDirective } from '../ui/directives/ui-button.directive';

export interface SerialUnitPickerData {
  units: SerialUnit[];
  selectedIds: number[];
  articleName?: string;
}

/** Selector secundario de series: solo devuelve IDs; no modifica el artículo ni registra movimientos. */
@Component({
  selector: 'app-serial-unit-picker-dialog',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule, MatIconModule, UiButtonDirective],
  templateUrl: './serial-unit-picker-dialog.html',
  styleUrl: './serial-unit-picker-dialog.scss'
})
export class SerialUnitPickerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SerialUnitPickerDialogComponent>);
  private readonly data = inject<SerialUnitPickerData>(MAT_DIALOG_DATA);

  readonly units: SerialUnit[] = [...(this.data.units || [])]
    .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber, 'es', { numeric: true }));
  readonly selected = new Set<number>((this.data.selectedIds || []).map(Number));
  readonly articleName = String(this.data.articleName || '').trim();
  search = '';

  get visibleUnits(): SerialUnit[] {
    const q = this.normalize(this.search);
    if (!q) return this.units;
    return this.units.filter(unit =>
      this.normalize(unit.serialNumber + ' ' + unit.id).includes(q)
    );
  }

  get selectedCount(): number { return this.selected.size; }
  get selectedVisibleCount(): number {
    return this.visibleUnits.filter(unit => this.selected.has(unit.id)).length;
  }
  get allVisibleSelected(): boolean {
    return this.visibleUnits.length > 0 && this.selectedVisibleCount === this.visibleUnits.length;
  }

  private normalize(value: string): string {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  onSearch(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }

  toggle(id: number, checked: boolean): void {
    if (checked) this.selected.add(id);
    else this.selected.delete(id);
  }

  selectAllVisible(): void {
    for (const unit of this.visibleUnits) this.selected.add(unit.id);
  }

  clearAllVisible(): void {
    for (const unit of this.visibleUnits) this.selected.delete(unit.id);
  }

  cancel(): void { this.dialogRef.close(); }

  apply(): void {
    this.dialogRef.close([...this.selected].sort((a, b) => a - b));
  }

  trackByUnit(_index: number, unit: SerialUnit): number { return unit.id; }
}
