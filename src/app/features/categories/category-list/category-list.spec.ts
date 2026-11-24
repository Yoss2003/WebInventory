import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CategoryListComponent } from './category-list';
import { CategoryService } from '../../../core/services/category';
import { ToastService } from '../../../shared/toast/toast.service';

describe('CategoryListComponent', () => {
  it('creates and loads categories', async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryListComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CategoryService, useValue: {getCategories: () => of([])} },
        { provide: MatDialog, useValue: {open: () => ({afterClosed: () => of(false)})} },
        { provide: ToastService, useValue: {success: () => null, error: () => null, warning: () => null, info: () => null} }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(CategoryListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.dataSource.data).toEqual([]);
    expect(fixture.componentInstance.loading).toBe(false);
  });
});
