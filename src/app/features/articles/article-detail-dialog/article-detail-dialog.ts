import { ChangeDetectorRef, DestroyRef, Component, OnDestroy, OnInit, inject, ViewChild, ElementRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoneyPipe } from '../../../shared/money.pipe';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, of, catchError } from 'rxjs';
import { ArticleService } from '../../../core/services/articles';
import { Article, ArticleDetail } from '../../../core/models/article.model';
import { SerialUnitsService } from '../../../core/services/serial-units';
import { ConfirmationDialogService } from '../../../shared/confirm-dialog/confirmation-dialog.service';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';
import { UiTableActionDirective } from '../../../shared/ui/directives/ui-table-action.directive';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatTooltipModule } from '@angular/material/tooltip';

interface SerialUnitDraft {
  serialNumber: string;
}

@Component({
  selector: 'app-article-detail-dialog',
  standalone: true,
  imports: [
    MoneyPipe, CommonModule, FormsModule, MatDialogModule, MatIconModule,
    MatTooltipModule, LoadingIndicatorComponent, UiButtonDirective, UiTableActionDirective
  ],
  templateUrl: './article-detail-dialog.html',
  styleUrl: './article-detail-dialog.scss'
})
export class ArticleDetailDialogComponent implements OnInit, OnDestroy {
  readonly dialogRef = inject(MatDialogRef<ArticleDetailDialogComponent>);
  readonly data: { id: number; articleName?: string; categoryName?: string; brandName?: string; inventoryName?: string } = inject(MAT_DIALOG_DATA);
  private readonly api = inject(ArticleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly serials = inject(SerialUnitsService);
  private readonly confirms = inject(ConfirmationDialogService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly codeReader = new BrowserMultiFormatReader();
  private scanControls: any = null;
  private dragStartX = 0;
  private dragStartY = 0;

  isScanningBatch = false;
  scanTargetIndex = -1;
  registeringBatch = false;
  decommissioning = false;
  selectedDecommissionIds = new Set<number>();
  serialNotice = '';
  decommissionReason = '';
  hasChanges = false;
  batchRows: SerialUnitDraft[] = [{ serialNumber: '' }];

  article: Article | null = null;
  loading = true;
  error = '';
  photo: string | null = null;
  voucher: string | null = null;
  photoIsPdf = false;
  voucherIsPdf = false;
  previewMedia: { url: string; title: string; isPdf: boolean } | null = null;
  previewSafeUrl: SafeResourceUrl | null = null;
  previewZoom = 1;
  previewPanX = 0;
  previewPanY = 0;
  isDraggingPreview = false;

  @ViewChild('mediaLightbox') mediaLightbox?: ElementRef<HTMLDialogElement>;

  private refreshView(): void {
    if (!this.destroyRef.destroyed) this.cdr.detectChanges();
  }

  get canRegisterBatch(): boolean {
    return !this.registeringBatch && this.batchRows.length > 0 &&
      this.batchRows.every(row => row.serialNumber.trim().length > 0);
  }

  get characteristics(): Array<{ name: string; value: string }> {
    try {
      const attrs = JSON.parse(this.article?.characteristics || '{}');
      return Object.entries(attrs)
        .filter(([_, val]) => val != null && String(val).trim())
        .map(([name, val]) => ({ name, value: String(val) }));
    } catch {
      return this.article?.characteristics ? [{ name: 'Características', value: this.article.characteristics }] : [];
    }
  }

  get categoryLabel(): string {
    return this.data.categoryName?.trim() || (this.article ? `#${this.article.categoryId}` : '—');
  }

  get brandLabel(): string {
    return this.data.brandName?.trim() || (this.article?.brandId ? `#${this.article.brandId}` : '—');
  }

  get inventoryLabel(): string {
    return this.data.inventoryName?.trim() || (this.article ? `#${this.article.inventoryId}` : '—');
  }

  ngOnInit(): void {
    this.api.getArticle(this.data.id).subscribe({
      next: article => {
        this.article = article;
        this.loading = false;
        this.refreshView();
        if (article.mainPhotoPath) {
          this.api.getMedia(article.id, 'photo').subscribe({
            next: b => {
              this.photo = URL.createObjectURL(b);
              this.photoIsPdf = b.type === 'application/pdf';
              this.refreshView();
            }
          });
        }
        if (article.mainVoucherPath) {
          this.api.getMedia(article.id, 'voucher').subscribe({
            next: b => {
              this.voucher = URL.createObjectURL(b);
              this.voucherIsPdf = b.type === 'application/pdf';
              this.refreshView();
            }
          });
        }
      },
      error: err => {
        this.loading = false;
        this.error = String(err?.error?.error ?? 'No se pudo consultar el artículo.');
        this.refreshView();
      }
    });
  }

  toggleDecommissionSelection(detailId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.selectedDecommissionIds.add(detailId);
    else this.selectedDecommissionIds.delete(detailId);

    if (this.selectedDecommissionIds.size === 0) {
      this.decommissionReason = '';
    }
    this.refreshView();
  }

  addBatchRow(): void {
    if (this.batchRows.length >= 1000 || this.registeringBatch) return;
    this.batchRows = [...this.batchRows, { serialNumber: '' }];
  }

  removeBatchRow(index: number): void {
    if (this.registeringBatch || this.batchRows.length <= 1) return;
    this.batchRows = this.batchRows.filter((_, i) => i !== index);
  }

  registerBatch(): void {
    const article = this.article;
    if (!article || !article.isActive || this.registeringBatch || !this.batchRows.length) return;

    const baseDetail: ArticleDetail | undefined = (article.details ?? article.articleDetails ?? [])[0];
    const sharedAttrs = {
      attr1: String(baseDetail?.attr1 ?? '').trim(),
      attr2: String(baseDetail?.attr2 ?? '').trim(),
      attr3: String(baseDetail?.attr3 ?? '').trim(),
      attr4: String(baseDetail?.attr4 ?? '').trim(),
      attr5: String(baseDetail?.attr5 ?? '').trim(),
      attr6: String(baseDetail?.attr6 ?? '').trim()
    };

    const rows = this.batchRows.map(row => ({
      serialNumber: row.serialNumber.trim(),
      ...sharedAttrs
    }));

    if (rows.length > 1000 || rows.some(row => !row.serialNumber || row.serialNumber.length > 150)) {
      this.snackBar.open('Atención: todas las unidades necesitan un número de serie de hasta 150 caracteres.', 'Cerrar', { duration: 4000 });
      return;
    }

    const serials = rows.map(row => row.serialNumber.toLocaleUpperCase('es-PE'));
    if (new Set(serials).size !== serials.length) {
      this.snackBar.open('Atención: el lote contiene números de serie duplicados. Revisa las filas.', 'Cerrar', { duration: 4000 });
      return;
    }

    this.registeringBatch = true;
    this.serials.addBatch(article.id, rows).subscribe({
      next: result => {
        this.registeringBatch = false;
        this.hasChanges = true;
        this.batchRows = [{ serialNumber: '' }];
        this.snackBar.open(`Se registraron ${result.added} unidades serializadas. Stock actual: ${result.stock}.`, 'Cerrar', { duration: 4000 });
        this.reloadArticle();
      },
      error: err => {
        this.registeringBatch = false;
        const raw = String(err?.error?.error ?? '').trim();
        const msg = raw
          ? (/error|fall[oó]|no se pud|rechazad|inv[aá]lid/i.test(raw) ? raw : `No se pudo registrar el lote: ${raw}`)
          : 'No se pudo registrar el lote.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5500 });
        this.refreshView();
      }
    });
  }

  decommissionSelected(): void {
    const article = this.article;
    const reason = this.decommissionReason.trim();
    const ids = Array.from(this.selectedDecommissionIds);

    if (!article || !article.isActive || ids.length === 0 || this.decommissioning) return;

    if (reason.length < 5 || reason.length > 500) {
      this.snackBar.open('Atención: debes escribir un motivo de baja de entre 5 y 500 caracteres.', 'Cerrar', { duration: 4000 });
      return;
    }

    const countText = ids.length === 1 ? '1 unidad serializada' : `${ids.length} unidades serializadas`;
    this.confirms.confirm({
      title: 'Dar de baja unidades serializadas',
      message: `¿Retirar definitivamente ${countText}? Quedarán inactivas y se conservarán en el historial. Motivo: ${reason}`,
      confirmLabel: 'Dar de baja',
      tone: 'danger',
      icon: 'remove_circle'
    }).subscribe(confirmed => {
      if (!confirmed || this.decommissioning) return;
      this.decommissioning = true;
      this.refreshView();

      const requests = ids.map(detailId =>
        this.serials.decommission(article.id, detailId, reason).pipe(
          catchError(err => of({ error: String(err?.error?.error ?? 'No se pudo dar de baja la unidad.'), detailId }))
        )
      );

      forkJoin(requests).subscribe(results => {
        this.decommissioning = false;
        const okCount = results.filter(r => !('error' in r)).length;
        const failCount = results.length - okCount;

        if (okCount > 0) {
          this.hasChanges = true;
          this.selectedDecommissionIds.clear();
          this.decommissionReason = '';
          this.reloadArticle();
        }

        if (failCount === 0) {
          this.snackBar.open(`Se retiraron ${okCount} ${okCount === 1 ? 'unidad' : 'unidades'} correctamente.`, 'Cerrar', { duration: 4000 });
        } else if (okCount > 0) {
          this.snackBar.open(`Atención: se retiraron ${okCount} unidades, pero ${failCount} quedaron pendientes por restricciones.`, 'Cerrar', { duration: 5000 });
        } else {
          const raw = (results[0] as { error: string }).error || 'No se pudo dar de baja las unidades seleccionadas.';
          const msg = /error|fall[oó]|no se pud|rechazad|inv[aá]lid/i.test(raw) ? raw : `No se pudo dar de baja: ${raw}`;
          this.snackBar.open(msg, 'Cerrar', { duration: 5500 });
        }
        this.refreshView();
      });
    });
  }

  private reloadArticle(): void {
    this.api.getArticle(this.data.id).subscribe({
      next: article => { this.article = article; this.refreshView(); },
      error: () => {
        this.snackBar.open('Atención: no se actualizó la vista automáticamente; vuelve a abrir la ficha para ver el estado reciente.', 'Cerrar', { duration: 4500 });
        this.refreshView();
      }
    });
  }

  async openBatchScanner(targetIndex: number): Promise<void> {
    if (this.isScanningBatch || this.registeringBatch) return;
    this.scanTargetIndex = targetIndex;
    this.isScanningBatch = true;
    this.refreshView();

    setTimeout(async () => {
      const videoElement = document.getElementById('detail-batch-video') as HTMLVideoElement | null;
      if (!videoElement) {
        this.stopBatchScanner();
        return;
      }

      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!devices.length) throw new Error('No se encontraron cámaras');

        let selectedDeviceId = devices[0].deviceId;
        const backCamera = devices.find((d: any) =>
          d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera')
        );
        if (backCamera) selectedDeviceId = backCamera.deviceId;

        const readerConfig = this.codeReader as any;
        readerConfig.timeBetweenDecodingAttempts = 600;
        readerConfig.delayBetweenScanAttempts = 600;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.UPC_A
        ]);
        this.codeReader.setHints(hints);

        let lastScannedCode = '';

        this.codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, (result, err, controls) => {
          this.scanControls = controls;

          if (result && this.isScanningBatch) {
            const text = result.getText().trim();
            if (!text || text === lastScannedCode) return;

            const normalized = text.toLocaleUpperCase('es-PE');
            const existingSerials = (this.article?.details ?? this.article?.articleDetails ?? [])
              .map(d => String(d.serialNumber ?? '').trim().toLocaleUpperCase('es-PE'));
            const batchSerials = this.batchRows
              .map((r, idx) => (this.scanTargetIndex >= 0 && idx === this.scanTargetIndex) ? '' : r.serialNumber.trim().toLocaleUpperCase('es-PE'));

            if (existingSerials.includes(normalized) || batchSerials.includes(normalized)) {
              lastScannedCode = text;
              this.snackBar.open(`Atención: la serie ${text} ya está registrada.`, 'Cerrar', { duration: 2200 });
              return;
            }

            lastScannedCode = text;

            if (this.scanTargetIndex >= 0) {
              // Modo individual: llena la fila y cierra
              this.batchRows[this.scanTargetIndex].serialNumber = text;
              this.snackBar.open(`Serie #${this.scanTargetIndex + 1} detectada: ${text}`, 'Cerrar', { duration: 2000 });
              this.stopBatchScanner();
              return;
            } else {
              // Modo continuo: llena la primera fila vacía o añade una nueva
              const emptyIdx = this.batchRows.findIndex(r => !r.serialNumber.trim());
              if (emptyIdx !== -1) {
                this.batchRows[emptyIdx].serialNumber = text;
                this.snackBar.open(`Serie #${emptyIdx + 1} agregada: ${text}`, 'Cerrar', { duration: 1800 });
              } else if (this.batchRows.length < 1000) {
                this.batchRows = [...this.batchRows, { serialNumber: text }];
                this.snackBar.open(`Serie #${this.batchRows.length} agregada: ${text}`, 'Cerrar', { duration: 1800 });
              } else {
                this.snackBar.open('Atención: se alcanzó el límite máximo de 1000 unidades.', 'Cerrar', { duration: 3000 });
                this.stopBatchScanner();
                return;
              }
              this.refreshView();
            }
          }

          if (err) {
            const errName = err.name || '';
            const isIgnorable = errName === 'NotFoundException' || errName === 'FormatException' || errName === 'ChecksumException';
            if (!isIgnorable) console.warn('Advertencia del escáner:', err);
          }
        });
      } catch {
        this.snackBar.open('No se pudo acceder a la cámara. Revisa los permisos.', 'Cerrar', { duration: 4000 });
        this.stopBatchScanner();
      }
    }, 50);
  }

  stopBatchScanner(): void {
    if (this.scanControls) {
      try { this.scanControls.stop(); } catch {}
      this.scanControls = null;
    }
    try { (this.codeReader as any).reset(); } catch {}
    this.isScanningBatch = false;
    this.scanTargetIndex = -1;
    this.refreshView();
  }

  openMediaPreview(kind: 'photo' | 'voucher'): void {
    const url = kind === 'photo' ? this.photo : this.voucher;
    if (!url) return;

    const isPdf = kind === 'photo' ? this.photoIsPdf : this.voucherIsPdf;
    const title = kind === 'photo' ? 'Foto del artículo' : 'Comprobante del artículo';

    this.previewMedia = { url, title, isPdf };
    this.previewSafeUrl = isPdf ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
    this.resetPreviewTransform();
    this.refreshView();

    setTimeout(() => {
      const dialog = this.mediaLightbox?.nativeElement;
      if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
        dialog.showModal();
      }
    }, 0);
  }

  closeMediaPreview(): void {
    const dialog = this.mediaLightbox?.nativeElement;
    if (dialog && dialog.open) dialog.close();
    this.onLightboxNativeClose();
  }

  onLightboxNativeClose(): void {
    this.previewMedia = null;
    this.previewSafeUrl = null;
    this.isDraggingPreview = false;
    this.refreshView();
  }

  zoomPreview(delta: number): void {
    const next = Math.min(4, Math.max(0.5, Number((this.previewZoom + delta).toFixed(2))));
    this.previewZoom = next;
    if (next <= 1) {
      this.previewPanX = 0;
      this.previewPanY = 0;
    }
    this.refreshView();
  }

  resetPreviewTransform(): void {
    this.previewZoom = 1;
    this.previewPanX = 0;
    this.previewPanY = 0;
    this.isDraggingPreview = false;
  }

  onPreviewWheel(event: WheelEvent): void {
    if (!this.previewMedia || this.previewMedia.isPdf) return;
    event.preventDefault();
    this.zoomPreview(event.deltaY < 0 ? 0.2 : -0.2);
  }

  onPreviewPointerDown(event: PointerEvent): void {
    if (!this.previewMedia || this.previewMedia.isPdf || this.previewZoom <= 1) return;
    this.isDraggingPreview = true;
    this.dragStartX = event.clientX - this.previewPanX;
    this.dragStartY = event.clientY - this.previewPanY;
    (event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId);
  }

  onPreviewPointerMove(event: PointerEvent): void {
    if (!this.isDraggingPreview) return;
    this.previewPanX = event.clientX - this.dragStartX;
    this.previewPanY = event.clientY - this.dragStartY;
    this.refreshView();
  }

  onPreviewPointerUp(): void {
    if (!this.isDraggingPreview) return;
    this.isDraggingPreview = false;
    this.refreshView();
  }

  ngOnDestroy(): void {
    this.closeMediaPreview();
    this.stopBatchScanner();
    if (this.photo) URL.revokeObjectURL(this.photo);
    if (this.voucher) URL.revokeObjectURL(this.voucher);
  }
}