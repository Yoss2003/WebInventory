import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UiButtonDirective } from '../../directives/ui-button.directive';
import { LoadingIndicatorComponent } from '../../../loading/loading-indicator';
import { ModalStandardService } from '../../services/modal-standard.service';
import type {
  ModalActionId,
  ModalFooterAction,
  ModalResolvedFooterAction,
  ModalSection,
  ModalStandardType
} from '../../models/modal-standard.model';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, UiButtonDirective, LoadingIndicatorComponent],
  templateUrl: './modal-shell.component.html',
  styleUrl: './modal-shell.component.scss'
})
export class ModalShellComponent implements AfterViewInit, OnChanges, OnDestroy {
  private static nextContentId = 0;

  readonly contentId = 'inv-modal-content-' + ModalShellComponent.nextContentId++;

  @Input() type: ModalStandardType = 'mainForm';
  @Input() title: string | null = null;
  @Input() subtitle: string | null = null;
  @Input() icon: string | null = null;
  @Input() infoTooltip: string | null = null;

  @Input() headerVisible: boolean | null = null;
  @Input() iconVisible: boolean | null = null;
  @Input() subtitleVisible: boolean | null = null;
  @Input() infoVisible: boolean | null = null;
  @Input() closeVisible: boolean | null = null;

  @Input() sections: ModalSection[] | null = null;
  @Input() sectionsVisible: boolean | null = null;
  @Input() activeSection = 0;

  /** null = acciones recomendadas por el catálogo; [] = ninguna acción. */
  @Input() footerActions: ModalFooterAction[] | null = null;
  @Input() footerVisible: boolean | null = null;
  @Input() busyActionId: ModalActionId | null = null;
  @Input() loadingText: string | null = null;
  @Input() contentScrollable = true;

  @Output() readonly sectionChange = new EventEmitter<number>();
  @Output() readonly actionClicked = new EventEmitter<ModalActionId>();
  @Output() readonly closeRequested = new EventEmitter<void>();

  @ViewChild('content') private contentRef?: ElementRef<HTMLElement>;

  private readonly standards = inject(ModalStandardService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private contentAnimation: Animation | null = null;
  private viewReady = false;

  get standard() { return this.standards.get(this.type); }
  get effectiveSubtitle(): string { return this.subtitle ?? this.standard.header.subtitle; }
  get effectiveIcon(): string { return this.icon ?? this.standard.header.icon; }
  get effectiveInfoTooltip(): string { return this.infoTooltip ?? this.standard.header.infoText; }
  get effectiveSections(): ModalSection[] { return this.sections ?? this.standard.header.defaultSections; }
  get effectiveActions(): ModalResolvedFooterAction[] {
    return this.standards.resolveFooterActions(this.type, this.footerActions);
  }
  get leftActions(): ModalResolvedFooterAction[] {
    return this.effectiveActions.filter(action => action.position === 'left');
  }
  get rightActions(): ModalResolvedFooterAction[] {
    return this.effectiveActions.filter(action => action.position === 'right');
  }
  get showHeader(): boolean { return this.headerVisible ?? this.standard.header.visibleByDefault; }
  get showIcon(): boolean { return this.iconVisible ?? this.standard.header.iconEnabledByDefault; }
  get showSubtitle(): boolean { return this.subtitleVisible ?? this.standard.header.subtitleEnabledByDefault; }
  get showInfo(): boolean { return this.infoVisible ?? this.standard.header.infoEnabledByDefault; }
  get showClose(): boolean { return this.closeVisible ?? this.standard.header.closeEnabledByDefault; }
  get showSections(): boolean {
    const enabled = this.sectionsVisible ?? this.standard.header.sectionNavigationEnabledByDefault;
    return enabled && this.effectiveSections.length > 0;
  }
  get showFooter(): boolean {
    return this.standards.shouldShowFooter(this.type, this.footerVisible, this.footerActions);
  }
  get effectiveLoadingText(): string {
    return this.loadingText ?? this.standard.footer.loading.text;
  }

  ngAfterViewInit(): void { this.viewReady = true; }

  ngOnChanges(changes: SimpleChanges): void {
    const sectionChange = changes['activeSection'];
    if (!sectionChange || sectionChange.firstChange || !this.viewReady || !this.browser) return;
    if (this.standard.motion.sections.respectReducedMotion &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const content = this.contentRef?.nativeElement;
    if (!content || typeof content.animate !== 'function') return;

    const forward = Number(sectionChange.currentValue) >= Number(sectionChange.previousValue);
    const motionType = this.standard.motion.sections.type;
    if (motionType === 'none') return;

    const offset = motionType === 'directional-slide' ? (forward ? '18px' : '-18px') : '0';
    const fromTransform = motionType === 'slide-up' ? 'translateY(14px)' : 'translateX(' + offset + ')';
    this.contentAnimation?.cancel();
    this.contentAnimation = content.animate(
      [{ opacity: 0, transform: fromTransform }, { opacity: 1, transform: 'translate(0, 0)' }],
      { duration: this.standard.motion.sections.duration, easing: 'cubic-bezier(.22, 1, .36, 1)' }
    );
  }

  selectSection(index: number): void {
    if (index === this.activeSection || index < 0 || index >= this.effectiveSections.length || this.effectiveSections[index]?.disabled) return;
    this.sectionChange.emit(index);
  }

  emitAction(action: ModalActionId): void { this.actionClicked.emit(action); }
  requestClose(): void { this.closeRequested.emit(); }

  isBusy(action: ModalFooterAction): boolean { return this.busyActionId === action.id; }

  isDisabled(action: ModalFooterAction): boolean {
    if (action.disabled) return true;
    if (action.id === 'previous' && this.activeSection <= 0 && this.effectiveSections.length > 1) return true;
    if (action.id === 'next' && this.activeSection >= this.effectiveSections.length - 1 &&
        this.effectiveSections.length > 1) return true;
    return Boolean(this.busyActionId && this.standard.footer.loading.preventDoubleSubmit);
  }

  ngOnDestroy(): void { this.contentAnimation?.cancel(); }
}
