import { Directive, input } from '@angular/core';

export type UiTableActionTone = 'normal' | 'danger' | 'success';

/** Acción compacta para tablas: dimensiones y foco accesible compartidos. */
@Directive({
  selector: 'button[appUiTableAction]',
  standalone: true,
  host: {
    'class': 'ui-v2-table-action',
    '[class.ui-v2-table-action--danger]': 'tone() === "danger"',
    '[class.ui-v2-table-action--success]': 'tone() === "success"'
  }
})
export class UiTableActionDirective {
  readonly tone = input<UiTableActionTone>('normal', { alias: 'appUiTableAction' });
}
