import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export type UiSelectValue = string | number | null;

export interface UiSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

/**
 * Selector compartido de OmniStock. Centraliza la estructura Material,
 * la altura, el panel desplegable y la accesibilidad del ComboBox.
 */
@Component({
  selector: 'app-ui-select',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './ui-select.component.html',
  styleUrl: './ui-select.component.scss'
})
export class UiSelectComponent {
  @Input() value: UiSelectValue = '';
  @Input() options: UiSelectOption[] = [];
  @Input() ariaLabel = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() allowEmpty = false;
  @Input() emptyLabel = 'Todos';
  @Output() readonly valueChange = new EventEmitter<UiSelectValue>();

  select(value: UiSelectValue): void {
    if (!this.disabled) this.valueChange.emit(value);
  }
}
