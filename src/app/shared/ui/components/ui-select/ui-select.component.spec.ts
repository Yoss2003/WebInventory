import { TestBed } from '@angular/core/testing';
import { UiSelectComponent } from './ui-select.component';

describe('UiSelectComponent', () => {
  let component: UiSelectComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UiSelectComponent]
    });
    component = TestBed.createComponent(UiSelectComponent).componentInstance;
  });

  it('emite el valor seleccionado al enlace y al ControlValueAccessor', () => {
    const changed = vi.fn();
    const touched = vi.fn();
    const valueChange = vi.fn<(value: UiSelectValue) => void>();
    const selectionChange = vi.fn();

    component.registerOnChange(changed);
    component.registerOnTouched(touched);
    component.valueChange.subscribe(valueChange);
    component.selectionChange.subscribe(selectionChange);

    component.select(42);

    expect(component.value).toBe(42);
    expect(changed).toHaveBeenCalledWith(42);
    expect(valueChange).toHaveBeenCalledWith(42);
    expect(selectionChange).toHaveBeenCalledWith({ value: 42 });
    expect(touched).toHaveBeenCalledOnce();
  });

  it('no emite cambios cuando el selector está deshabilitado', () => {
    const changed = vi.fn();
    const valueChange = vi.fn();
    component.registerOnChange(changed);
    component.valueChange.subscribe(valueChange);
    component.setDisabledState(true);

    component.select('disabled');

    expect(changed).not.toHaveBeenCalled();
    expect(valueChange).not.toHaveBeenCalled();
  });

  it('actualiza el valor inicial y conserva el tipo de selección múltiple', () => {
    component.writeValue(7);
    expect(component.value).toBe(7);

    component.multiple = true;
    component.writeValue(null);
    expect(component.value).toEqual([]);
  });

  it('marca el control como tocado cuando se cierra el desplegable', () => {
    const touched = vi.fn();
    const openedChange = vi.fn();
    component.registerOnTouched(touched);
    component.openedChange.subscribe(openedChange);

    component.handleOpenedChange(true);
    expect(touched).not.toHaveBeenCalled();
    component.handleOpenedChange(false);

    expect(touched).toHaveBeenCalledOnce();
    expect(openedChange).toHaveBeenNthCalledWith(1, true);
    expect(openedChange).toHaveBeenNthCalledWith(2, false);
  });
});
