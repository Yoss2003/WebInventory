import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export type UiSelectValue = string | number | null | Array<string | number>;

export interface UiSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

/**
 * ComboBox compartido de OmniStock.
 * Admite tanto opciones declarativas como mat-option proyectados, y funciona
 * con ngModel, formControlName o enlaces value/valueChange.
 */
@Component({
  selector: 'app-ui-select',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => UiSelectComponent),
    multi: true
  }],
  templateUrl: './ui-select.component.html',
  styleUrl: './ui-select.component.scss',
  host: { class: 'inventory-select' }
})
export class UiSelectComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() value: UiSelectValue = '';
  @Input() options: UiSelectOption[] = [];
  @Input() ariaLabel = '';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;
  @Input() multiple = false;
  @Input() allowEmpty = false;
  @Input() emptyLabel = 'Todos';
  @Input() panelClass: string | string[] = ['inventory-select-options', 'inv-standard-select-panel'];
  @Input() ariaLabelledby: string | null = null;

  @Output() readonly valueChange = new EventEmitter<UiSelectValue>();
  @Output() readonly selectionChange = new EventEmitter<{ value: any }>();
  @Output() readonly openedChange = new EventEmitter<boolean>();

  private onChange: (value: UiSelectValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: UiSelectValue): void {
    this.value = value ?? (this.multiple ? [] : '');
  }

  registerOnChange(fn: (value: UiSelectValue) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  handleOpenedChange(open: boolean): void {
    this.openedChange.emit(open);
    if (!open) this.onTouched();
  }

  select(value: UiSelectValue): void {
    if (this.disabled) return;
    this.value = value;
    this.valueChange.emit(value);
    this.selectionChange.emit({ value });
    this.onChange(value);
    this.onTouched();
  }
}
