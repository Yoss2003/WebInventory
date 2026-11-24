import { TestBed } from '@angular/core/testing';
import { TableOverlayScrollbarService } from './table-overlay-scrollbar.service';

describe('TableOverlayScrollbarService', () => {
  let service: TableOverlayScrollbarService;
  let target: HTMLDivElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TableOverlayScrollbarService] });
    service = TestBed.inject(TableOverlayScrollbarService);
    target = document.createElement('div');
    target.className = 'inv-core-table-wrap';
    target.style.overflow = 'auto';
    target.appendChild(document.createElement('table'));
    document.body.appendChild(target);
  });

  afterEach(() => {
    target.remove();
    document.querySelectorAll('.inv-table-scroll-track').forEach(track => track.remove());
  });

  it('registra indicadores para una tabla con desplazamiento nativo', () => {
    (service as any).scan();

    expect(target.classList.contains('inv-overlay-scroll-target')).toBe(true);
    expect(document.querySelectorAll('.inv-table-scroll-track')).toHaveLength(2);
  });

  it('retira los indicadores y restaura el scroll nativo cuando deja de ser desplazable', () => {
    (service as any).scan();
    target.style.overflow = 'hidden';

    (service as any).scan();

    expect(target.classList.contains('inv-overlay-scroll-target')).toBe(false);
    expect(document.querySelectorAll('.inv-table-scroll-track')).toHaveLength(0);
  });

  it('limpia los indicadores si la tabla se retira del contenedor', () => {
    (service as any).scan();
    target.replaceChildren();

    (service as any).scan();

    expect(target.classList.contains('inv-overlay-scroll-target')).toBe(false);
    expect(document.querySelectorAll('.inv-table-scroll-track')).toHaveLength(0);
  });

  it('limpia los indicadores si el contenedor deja de ser una zona de tabla registrada', () => {
    (service as any).scan();
    target.classList.remove('inv-core-table-wrap');

    (service as any).scan();

    expect(target.classList.contains('inv-overlay-scroll-target')).toBe(false);
    expect(document.querySelectorAll('.inv-table-scroll-track')).toHaveLength(0);
  });
});
