import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ui-pagination',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './ui-pagination.component.html',
  styleUrl: './ui-pagination.component.scss'
})
export class UiPaginationComponent implements OnChanges {
  @Input() totalItems = 0;
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  @Input() label = 'registros';
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(Math.max(0, this.totalItems) / Math.max(1, this.pageSize)));
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.totalItems, this.page * this.pageSize);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['totalItems'] || changes['pageSize']) && this.totalItems > 0 && this.page > this.totalPages) {
      this.pageChange.emit(this.totalPages);
    }
    if (this.totalItems === 0 && this.page !== 1) this.pageChange.emit(1);
  }

  goTo(page: number): void {
    const next = Math.min(this.totalPages, Math.max(1, page));
    if (next !== this.page) this.pageChange.emit(next);
  }

  changePageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!this.pageSizeOptions.includes(value) || value === this.pageSize) return;
    this.pageSizeChange.emit(value);
    this.pageChange.emit(1);
  }
}
