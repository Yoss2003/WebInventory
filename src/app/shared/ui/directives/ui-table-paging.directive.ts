import { Directive, ElementRef, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { UiTablePagingLoadingService } from '../services/ui-table-paging-loading.service';

@Directive({
  selector: '[appUiTablePaging]',
  standalone: true
})
export class UiTablePagingDirective implements OnChanges, OnDestroy {
  @Input('appUiTablePaging') tableId = '';
  @Input() uiTablePagingLoading = false;

  private subscription?: Subscription;
  private overlay?: HTMLElement;
  private serviceLoading = false;

  constructor(
    private readonly element: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly pagingLoading: UiTablePagingLoadingService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tableId']) this.connect();
    if (changes['uiTablePagingLoading']) this.updateOverlay();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.overlay?.parentElement) this.renderer.removeChild(this.element.nativeElement, this.overlay);
    this.renderer.removeClass(this.element.nativeElement, 'ui-table-paging-host');
    this.renderer.removeAttribute(this.element.nativeElement, 'aria-busy');
  }

  private connect(): void {
    this.subscription?.unsubscribe();
    const id = String(this.tableId ?? '').trim();
    if (!id) {
      this.serviceLoading = false;
      this.updateOverlay();
      return;
    }
    this.renderer.addClass(this.element.nativeElement, 'ui-table-paging-host');
    this.subscription = this.pagingLoading.observe(id).subscribe(active => {
      this.serviceLoading = active;
      this.updateOverlay();
    });
  }

  private updateOverlay(): void {
    const active = this.serviceLoading || this.uiTablePagingLoading;
    const host = this.element.nativeElement;
    this.renderer.setAttribute(host, 'aria-busy', active ? 'true' : 'false');

    if (!active) {
      if (this.overlay?.parentElement) this.renderer.removeChild(host, this.overlay);
      this.overlay = undefined;
      return;
    }

    if (this.overlay) return;
    const overlay = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(overlay, 'ui-table-paging-skeleton');
    this.renderer.setAttribute(overlay, 'role', 'status');
    this.renderer.setAttribute(overlay, 'aria-label', 'Cargando registros de la tabla');

    for (let index = 0; index < 4; index++) {
      const row = this.renderer.createElement('div');
      this.renderer.addClass(row, 'ui-table-paging-skeleton__row');
      for (let cellIndex = 0; cellIndex < 5; cellIndex++) {
        const cell = this.renderer.createElement('span');
        this.renderer.addClass(cell, 'ui-table-paging-skeleton__cell');
        this.renderer.appendChild(row, cell);
      }
      this.renderer.appendChild(overlay, row);
    }

    this.renderer.appendChild(host, overlay);
    this.overlay = overlay;
  }
}
