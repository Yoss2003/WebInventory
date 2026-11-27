import { Injectable, TemplateRef, inject } from '@angular/core';
import type { ComponentType } from '@angular/cdk/portal';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { MODAL_STANDARDS } from '../config/modal-standards.config';
import {
  ModalActionId,
  ModalFooterAction,
  ModalResolvedFooterAction,
  ModalStandardDefinition,
  ModalStandardType
} from '../models/modal-standard.model';

@Injectable({ providedIn: 'root' })
export class ModalStandardService {
  private readonly dialog = inject(MatDialog);

  get(type: ModalStandardType): ModalStandardDefinition {
    return MODAL_STANDARDS[type];
  }

  getAllowedActions(type: ModalStandardType): readonly ModalActionId[] {
    return this.get(type).footer.allowedActions;
  }

  /** Anterior siempre queda a la izquierda; las demás acciones van a la derecha. */
  resolveFooterActions(
    type: ModalStandardType,
    requestedActions?: readonly ModalFooterAction[] | null
  ): ModalResolvedFooterAction[] {
    const standard = this.get(type);
    const source = requestedActions ?? standard.footer.defaultActions;

    return source
      .filter(action => standard.footer.allowedActions.includes(action.id))
      .map((action, index) => ({
        ...action,
        position: action.id === 'previous' ? 'left' as const : 'right' as const,
        order: Number.isFinite(action.order) ? action.order as number : index
      }))
      .sort((a, b) => {
        if (a.position !== b.position) return a.position === 'left' ? -1 : 1;
        const aIsPrimary = a.tone === 'primary' || a.tone === 'danger';
        const bIsPrimary = b.tone === 'primary' || b.tone === 'danger';
        if (aIsPrimary !== bIsPrimary) return aIsPrimary ? 1 : -1;
        return a.order - b.order;
      });
  }

  shouldShowFooter(
    type: ModalStandardType,
    requestedVisibility: boolean | null | undefined,
    actions: readonly ModalFooterAction[] | null | undefined
  ): boolean {
    const visible = requestedVisibility ?? this.get(type).footer.visibleByDefault;
    return visible && this.resolveFooterActions(type, actions).length > 0;
  }

  createDialogConfig<D = any>(
    type: ModalStandardType,
    overrides: MatDialogConfig<D> = {}
  ): MatDialogConfig<D> {
    const standard = this.get(type);
    const existingClasses = Array.isArray(overrides.panelClass)
      ? overrides.panelClass
      : overrides.panelClass ? [overrides.panelClass] : [];
    const panelClass = [...new Set([
      ...existingClasses,
      'inv-seven-modal',
      'inv-standard-modal',
      'inv-standard-modal--' + type
    ])];

    // El ancho y alto preferidos pertenecen a cada vista; los límites del viewport son globales.
    return {
      ...overrides,
      panelClass,
      maxWidth: overrides.maxWidth ?? 'calc(100vw - 24px)',
      maxHeight: overrides.maxHeight ?? 'calc(100dvh - 24px)',
      enterAnimationDuration: standard.motion.entry.duration,
      exitAnimationDuration: standard.motion.exit.duration
    };
  }

  open<T, D = any, R = any>(
    component: ComponentType<T>,
    type: ModalStandardType,
    overrides: MatDialogConfig<D> = {}
  ): MatDialogRef<T, R> {
    return this.dialog.open<T, D, R>(component, this.createDialogConfig(type, overrides));
  }

  openTemplate<C = unknown, D = any, R = any>(
    template: TemplateRef<C>,
    type: ModalStandardType,
    overrides: MatDialogConfig<D> = {}
  ): MatDialogRef<C, R> {
    return this.dialog.open<C, D, R>(template, this.createDialogConfig(type, overrides));
  }

  getSelectorPanelClass(kind: 'combo' | 'autocomplete'): string {
    return kind === 'combo'
      ? 'inventory-select-options inv-standard-select-panel'
      : 'inv-standard-autocomplete-panel';
  }
}
