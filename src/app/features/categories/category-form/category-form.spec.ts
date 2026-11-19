import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CategoryFormComponent } from './category-form';
import { CategoryService } from '../../../core/services/category';
import { ToastService } from '../../../shared/toast/toast.service';

describe('CategoryFormComponent', () => {
  let createCategoryMock: ReturnType<typeof vi.fn>;
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    createCategoryMock = vi.fn().mockReturnValue(of({ id: 10, name: 'Redes' }));
    toastMock = { success: vi.fn(), error: vi.fn() };
    dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [
        { provide: CategoryService, useValue: { createCategory: createCategoryMock } },
        { provide: ToastService, useValue: toastMock },
        { provide: MatDialogRef, useValue: dialogRefMock }
      ]
    }).compileComponents();
  });

  it('no envía el formulario si el nombre está vacío', () => {
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const component = fixture.componentInstance;

    component.onSubmit();

    expect(createCategoryMock).not.toHaveBeenCalled();
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  it('crea la categoría, muestra toast de éxito y cierra el diálogo', () => {
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const component = fixture.componentInstance;

    component.categoryForm.patchValue({ name: 'Redes', description: 'Equipos de red' });
    component.onSubmit();

    expect(createCategoryMock).toHaveBeenCalledWith({
      name: 'Redes',
      description: 'Equipos de red',
      isActive: true,
      companyId: 1
    });
    expect(toastMock.success).toHaveBeenCalledWith('Categoría creada exitosamente');
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('muestra toast de error si falla la creación', () => {
    createCategoryMock.mockReturnValue(throwError(() => new Error('API error')));
    const fixture = TestBed.createComponent(CategoryFormComponent);
    const component = fixture.componentInstance;

    component.categoryForm.patchValue({ name: 'Redes' });
    component.onSubmit();

    expect(toastMock.error).toHaveBeenCalledWith('Error al crear categoría');
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});