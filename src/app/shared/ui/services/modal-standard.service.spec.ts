import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ModalStandardService } from './modal-standard.service';
import type { ModalFooterAction } from '../models/modal-standard.model';

class TestDialogComponent {}

describe('ModalStandardService', () => {
  let service: ModalStandardService;
  const dialogRef = {};
  const dialogStub = { open: vi.fn(() => dialogRef) };

  beforeEach(() => {
    dialogStub.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        ModalStandardService,
        { provide: MatDialog, useValue: dialogStub }
      ]
    });
    service = TestBed.inject(ModalStandardService);
  });

  it('mantiene las duraciones comunes de apertura, salida y secciones', () => {
    const standard = service.get('mainForm');
    expect(standard.motion.entry.duration).toBe(380);
    expect(standard.motion.exit.duration).toBe(280);
    expect(standard.motion.sections.duration).toBe(280);
  });

  it('ubica Anterior a la izquierda y el resto de acciones a la derecha', () => {
    const actions: ModalFooterAction[] = [
      { id: 'previous', label: 'Anterior', tone: 'secondary', order: 0 },
      { id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 1 },
      { id: 'primary', label: 'Guardar', tone: 'primary', order: 2 }
    ];
    const resolved = service.resolveFooterActions('mainForm', actions);
    expect(resolved.map(action => [action.id, action.position])).toEqual([
      ['previous', 'left'], ['cancel', 'right'], ['primary', 'right']
    ]);
  });

  it('mantiene la acción secundaria antes de la primaria aunque la vista invierta su orden', () => {
    const actions: ModalFooterAction[] = [
      { id: 'primary', label: 'Guardar', tone: 'primary', order: 0 },
      { id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 1 }
    ];
    expect(service.resolveFooterActions('mainForm', actions).map(action => action.id))
      .toEqual(['cancel', 'primary']);
  });

  it('conserva la configuración particular de selectores del tipo detalle', () => {
    const detail = service.get('detail');
    expect(detail.selectors.presentByDefault).toBe(false);
    expect(detail.selectors.dropdown.enabled).toBe(false);
    expect(detail.selectors.autocomplete.enabled).toBe(false);
    expect(service.get('selector').header.infoEnabledByDefault).toBe(true);
  });

  it('no permite colocar Limpiar como acción estructural del footer', () => {
    const actions = [
      { id: 'reset', label: 'Limpiar', tone: 'secondary' },
      { id: 'cancel', label: 'Cancelar', tone: 'secondary' },
      { id: 'primary', label: 'Aplicar filtros', tone: 'primary' }
    ] as unknown as ModalFooterAction[];
    const resolved = service.resolveFooterActions('filters', actions);
    expect(resolved.map(action => action.id)).toEqual(['cancel', 'primary']);
  });

  it('permite ocultar el footer o mostrarlo solo cuando existen acciones', () => {
    expect(service.shouldShowFooter('mainForm', false, [])).toBe(false);
    expect(service.shouldShowFooter('mainForm', true, [])).toBe(false);
    expect(service.shouldShowFooter('mainForm', true, null)).toBe(true);
  });

  it('añade las clases y duraciones estándar sin imponer dimensiones', () => {
    const config = service.createDialogConfig('mainForm', { panelClass: 'article-form-panel' });
    expect(config.panelClass).toEqual([
      'article-form-panel', 'inv-seven-modal', 'inv-standard-modal', 'inv-standard-modal--mainForm'
    ]);
    expect(config.enterAnimationDuration).toBe(380);
    expect(config.exitAnimationDuration).toBe(280);
    expect(config.width).toBeUndefined();
    expect(config.height).toBeUndefined();
    expect(config.maxWidth).toBe('calc(100vw - 24px)');
    expect(config.maxHeight).toBe('calc(100dvh - 24px)');
  });

  it('permite que cada vista sobrescriba los límites del viewport', () => {
    const config = service.createDialogConfig('wizard', {
      width: 'min(900px, calc(100vw - 32px))',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100dvh - 32px)'
    });
    expect(config.width).toBe('min(900px, calc(100vw - 32px))');
    expect(config.maxWidth).toBe('calc(100vw - 32px)');
    expect(config.maxHeight).toBe('calc(100dvh - 32px)');
  });

  it('centraliza las clases de panel para ComboBox y autocompletado', () => {
    expect(service.getSelectorPanelClass('combo')).toBe('inventory-select-options inv-standard-select-panel');
    expect(service.getSelectorPanelClass('autocomplete')).toBe('inv-standard-autocomplete-panel');
  });

  it('abre diálogos sin reemplazar la configuración particular de la vista', () => {
    service.open(TestDialogComponent, 'selector', { width: '720px', data: { source: 'test' } });
    expect(dialogStub.open).toHaveBeenCalledWith(TestDialogComponent, expect.objectContaining({
      width: '720px',
      enterAnimationDuration: 380,
      exitAnimationDuration: 280
    }));
  });
});
