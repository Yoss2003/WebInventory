import type { UiButtonTone } from '../directives/ui-button.directive';

export type ModalStandardType =
  | 'mainForm'
  | 'wizard'
  | 'detail'
  | 'selector'
  | 'confirmation'
  | 'informative'
  | 'subInfo'
  | 'subTask'
  | 'filters';

/** Acciones estructurales del footer. Las acciones propias de cada vista
 * (por ejemplo, Limpiar filtros) pertenecen al contenido y no a este contrato. */
export type ModalActionId = 'previous' | 'cancel' | 'close' | 'next' | 'primary';

export interface ModalSection {
  id: string;
  label: string;
  completed?: boolean;
  disabled?: boolean;
}

export interface ModalFooterAction {
  id: ModalActionId;
  label: string;
  tone: UiButtonTone;
  order?: number;
  disabled?: boolean;
  icon?: string;
}

export interface ModalMotionDefinition {
  type: 'scale-fade' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'none';
  duration: number;
}

export interface ModalSelectorMotionDefinition {
  enabled: boolean;
  open: 'fade-slide' | 'fade' | 'scale' | 'none';
  close: 'fade-slide' | 'fade' | 'scale' | 'none';
  duration: number;
}

export interface ModalStandardDefinition {
  type: ModalStandardType;
  name: string;
  purpose: string;
  header: {
    visibleByDefault: boolean;
    iconEnabledByDefault: boolean;
    icon: string;
    subtitleEnabledByDefault: boolean;
    subtitle: string;
    infoEnabledByDefault: boolean;
    infoText: string;
    closeEnabledByDefault: boolean;
    sectionNavigationEnabledByDefault: boolean;
    sectionNavigationPlacement: 'header-right-inline';
    sectionNavigationMode: 'tabs-inline-right' | 'compact-inline-right';
    defaultSections: ModalSection[];
  };
  footer: {
    visibleByDefault: boolean;
    allowedActions: readonly ModalActionId[];
    defaultActions: ModalFooterAction[];
    loading: {
      spinner: boolean;
      text: string;
      preventDoubleSubmit: boolean;
      keepButtonWidth: boolean;
    };
  };
  motion: {
    entry: ModalMotionDefinition;
    exit: ModalMotionDefinition;
    sections: {
      type: 'directional-slide' | 'fade' | 'slide-up' | 'none';
      duration: number;
      respectReducedMotion: boolean;
    };
  };
  selectors: {
    presentByDefault: boolean;
    allowedTypes: readonly ('combo' | 'autocomplete' | 'date' | 'multi')[];
    dropdown: ModalSelectorMotionDefinition;
    autocomplete: ModalSelectorMotionDefinition;
  };
}

export interface ModalResolvedFooterAction extends ModalFooterAction {
  position: 'left' | 'right';
  order: number;
}
