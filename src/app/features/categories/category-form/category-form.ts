import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CategoryService } from '../../../core/services/category';
import { ToastService } from '../../../shared/toast/toast.service';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatInputModule, MatDialogModule, UiButtonDirective],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss'
})
export class CategoryFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  readonly dialogRef = inject(MatDialogRef<CategoryFormComponent>);

  categoryForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    isActive: [true],
    companyId: [1]
  });

  onSubmit(): void {
    if (this.categoryForm.invalid) return;

    this.categoryService.createCategory(this.categoryForm.value).subscribe({
      next: () => {
        this.toast.success('Categoría creada exitosamente');
        this.dialogRef.close(true);
      },
      error: () => this.toast.error('Error al crear categoría')
    });
  }
}