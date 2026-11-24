import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UiButtonDirective } from '../ui/directives/ui-button.directive';
import { ModalShellComponent } from '../ui/components/modal-shell/modal-shell.component';
import type { ModalActionId, ModalFooterAction } from '../ui/models/modal-standard.model';

export interface CatalogSimilarMatch { id: number; name: string; }
export interface CatalogSimilarData {
  type: string;
  enteredName: string;
  matches: CatalogSimilarMatch[];
}
export type CatalogSimilarChoice = { action: 'reuse'; id: number } | { action: 'create' } | null;

@Component({
  selector: 'app-catalog-similar-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, UiButtonDirective, ModalShellComponent],
  template: `
    <app-modal-shell
      type="confirmation"
      title="Posible duplicado"
      subtitle="Se encontraron registros con nombres similares"
      icon="warning_amber"
      [infoVisible]="false"
      [closeVisible]="false"
      [footerActions]="modalFooterActions"
      (actionClicked)="handleModalAction($event)"
      (closeRequested)="cancel()">
      <div class="catalog-similar-dialog">
        <p>Quieres registrar <strong>{{data.enteredName}}</strong>, pero encontramos {{data.type}} similares.</p>
        <p>Selecciona un registro existente o confirma que deseas crear uno nuevo.</p>
        <div class="match" *ngFor="let item of data.matches">
          <span><strong>{{item.name}}</strong> <small>ID {{item.id}}</small></span>
          <button type="button" appUiButton="secondary" (click)="reuse(item.id)">Utilizar</button>
        </div>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .catalog-similar-dialog { background:#17232f; color:#eef5fa; padding:14px 18px; min-width:min(340px,85vw); }
    p { font-size:13px; line-height:1.6; }
    .match { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:9px 0; border-bottom:1px solid #425464; }
    small { color:#b6c6d4; margin-left:6px; }
  `]
})
export class CatalogSimilarDialogComponent {
  readonly data: CatalogSimilarData = inject(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CatalogSimilarDialogComponent, CatalogSimilarChoice>);

  get modalFooterActions(): ModalFooterAction[] {
    return [
      { id: 'cancel', label: 'Cancelar', tone: 'secondary', order: 0 },
      { id: 'primary', label: 'Crear de todos modos', tone: 'primary', order: 1 }
    ];
  }

  handleModalAction(action: ModalActionId): void {
    if (action === 'cancel') this.cancel();
    if (action === 'primary') this.create();
  }

  reuse(id: number): void { this.ref.close({ action: 'reuse', id }); }
  create(): void { this.ref.close({ action: 'create' }); }
  cancel(): void { this.ref.close(null); }
}
