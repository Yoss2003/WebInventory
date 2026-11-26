import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButtonDirective } from './ui-button.directive';

@Component({
  standalone: true,
  imports: [UiButtonDirective],
  template: `
    <button appUiButton="primary"
      [uiButtonLoading]="loading"
      [uiButtonLoadingText]="loadingText">Guardar</button>
  `
})
class UiButtonDirectiveHost {
  loading = true;
  loadingText = 'Cargando...';
}

describe('UiButtonDirective loading state', () => {
  it('exposes accessible loading state and removes it after completion', async () => {
    await TestBed.configureTestingModule({ imports: [UiButtonDirectiveHost] }).compileComponents();
    const fixture = TestBed.createComponent(UiButtonDirectiveHost);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('ui-v2-button--loading')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('data-loading-label')).toBe('Cargando...');

    fixture.componentInstance.loading = false;
    fixture.detectChanges();

    expect(button.classList.contains('ui-v2-button--loading')).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.hasAttribute('data-loading-label')).toBe(false);
  });
});
