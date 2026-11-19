import { Directive, computed, input } from '@angular/core';

export type UiButtonTone = 'primary' | 'secondary' | 'danger' | 'ghost' | 'close';

/** Clase y rol visual consistentes sin modificar el (click) ni el formulario. */
@Directive({
  selector: 'button[appUiButton]',
  standalone: true,
  host: {
    'class': 'ui-v2-button',
    '[class.ui-v2-button--primary]': 'effectiveTone() === "primary"',
    '[class.ui-v2-button--secondary]': 'effectiveTone() === "secondary"',
    '[class.ui-v2-button--danger]': 'effectiveTone() === "danger"',
    '[class.ui-v2-button--ghost]': 'effectiveTone() === "ghost"',
    '[class.ui-v2-button--close]': 'effectiveTone() === "close"'
  }
})
export class UiButtonDirective {
  readonly tone = input<UiButtonTone | '' | undefined>('secondary', { alias: 'appUiButton' });

  readonly effectiveTone = computed<UiButtonTone>(() => {
    const t = this.tone();
    return t && t.length > 0 ? (t as UiButtonTone) : 'secondary';
  });
}
