import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CategoryService } from '../../../core/services/category';
import { ToastService } from '../../../shared/toast/toast.service';
import { ModalShellComponent } from '../../../shared/ui/components/modal-shell/modal-shell.component';
import type { ModalActionId, ModalFooterAction } from '../../../shared/ui/models/modal-standard.model';
import { UiControlDirective } from '../../../shared/ui/directives/ui-control.directive';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalShellComponent, UiControlDirective],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss'
})
export class CategoryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  readonly dialogRef = inject(MatDialogRef<CategoryFormComponent>);

  isSaving = false;

  categoryForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    isActive: [true],
    companyId: [1]
  });

  get modalFooterActions(): ModalFooterAction[] {
    return [
      { id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 0 },
      { id: 'primary', label: 'Guardar categoría', tone: 'primary', order: 1, disabled: this.categoryForm.invalid || this.isSaving }
    ];
  }

  handleModalAction(action: ModalActionId): void {
    if (action === 'cancel') this.dialogRef.close();
    if (action === 'primary') this.onSubmit();
  }

  onSubmit(): void {
    if (this.categoryForm.invalid || this.isSaving) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.categoryService.createCategory(this.categoryForm.value).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success('Categoría creada exitosamente');
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSaving = false;
        this.toast.error('Error al crear categoría');
      }
    });
  }
}
