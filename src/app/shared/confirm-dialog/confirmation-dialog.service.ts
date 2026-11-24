import { Injectable, inject } from '@angular/core';
import { ModalStandardService } from '../ui/services/modal-standard.service';
import { map, Observable } from 'rxjs';
import {
  DevConfirmDialogComponent,
  DevConfirmDialogData
} from './dev-confirm-dialog';

/** Confirmaciones de la aplicación con diseño común, nunca confirm()/prompt() nativos. */
@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
  private readonly modals = inject(ModalStandardService);

  private open(data: DevConfirmDialogData) {
    return this.modals.open<DevConfirmDialogComponent, DevConfirmDialogData, boolean | string>(
      DevConfirmDialogComponent, 'confirmation', {
        panelClass: ['inv-seven-modal', 'inv-standard-confirm-modal'],
        width: 'min(470px, calc(100vw - 24px))',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 24px)',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        data
      }
    ).afterClosed();
  }

  confirm(data: DevConfirmDialogData): Observable<boolean> {
    return this.open({ ...data, requiresReason: false })
      .pipe(map(result => result === true));
  }

  requestReason(data: DevConfirmDialogData): Observable<string | null> {
    return this.open({ ...data, requiresReason: true })
      .pipe(map(result => typeof result === 'string' && result.trim()
        ? result.trim()
        : null));
  }
}
