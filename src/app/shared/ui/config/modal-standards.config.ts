import type {
  ModalActionId,
  ModalFooterAction,
  ModalSection,
  ModalStandardDefinition,
  ModalStandardType
} from '../models/modal-standard.model';

const ENTRY = Object.freeze({ type: 'scale-fade' as const, duration: 380 });
const EXIT = Object.freeze({ type: 'scale-fade' as const, duration: 280 });
const SECTION_MOTION = Object.freeze({
  type: 'directional-slide' as const,
  duration: 280,
  respectReducedMotion: true
});
const DROPDOWN_MOTION = Object.freeze({
  enabled: true,
  open: 'fade-slide' as const,
  close: 'fade-slide' as const,
  duration: 160
});
const LOADING = Object.freeze({
  spinner: true,
  text: 'Cargando',
  preventDoubleSubmit: true,
  keepButtonWidth: true
});
const SHARED_SELECTOR_TYPES = ['combo', 'autocomplete', 'date', 'multi'] as const;

function action(
  id: ModalActionId,
  label: string,
  tone: ModalFooterAction['tone'],
  order: number
): ModalFooterAction {
  return { id, label, tone, order };
}

function createDefinition(
  type: ModalStandardType,
  name: string,
  purpose: string,
  options: {
    icon?: string;
    iconEnabled?: boolean;
    subtitle?: string;
    info?: boolean;
    close?: boolean;
    sections?: string[];
    footer?: boolean;
    allowedActions: readonly ModalActionId[];
    actions: ModalFooterAction[];
    selectors?: boolean;
    selectorMotionEnabled?: boolean;
    selectorTypes?: readonly ('combo' | 'autocomplete' | 'date' | 'multi')[];
  }
): ModalStandardDefinition {
  const sections: ModalSection[] = (options.sections ?? []).map((label, index) => ({
    id: 'section-' + (index + 1),
    label
  }));

  return {
    type,
    name,
    purpose,
    header: {
      visibleByDefault: true,
      iconEnabledByDefault: options.iconEnabled ?? true,
      icon: options.icon ?? '',
      subtitleEnabledByDefault: false,
      subtitle: options.subtitle ?? '',
      infoEnabledByDefault: options.info ?? true,
      infoText: 'Información adicional sobre esta operación.',
      closeEnabledByDefault: options.close ?? false,
      sectionNavigationEnabledByDefault: sections.length > 0,
      sectionNavigationPlacement: 'header-right-inline',
      sectionNavigationMode: 'tabs-inline-right',
      defaultSections: sections
    },
    footer: {
      visibleByDefault: options.footer ?? true,
      allowedActions: options.allowedActions,
      defaultActions: options.actions,
      loading: { ...LOADING }
    },
    motion: {
      entry: { ...ENTRY },
      exit: { ...EXIT },
      sections: { ...SECTION_MOTION }
    },
    selectors: {
      presentByDefault: options.selectors ?? false,
      allowedTypes: options.selectorTypes ?? SHARED_SELECTOR_TYPES,
      dropdown: { ...DROPDOWN_MOTION, enabled: options.selectorMotionEnabled ?? true },
      autocomplete: { ...DROPDOWN_MOTION, enabled: options.selectorMotionEnabled ?? true }
    }
  };
}

/** Catálogo central: políticas y valores predeterminados, nunca dimensiones
 * ni distribución del contenido interno de una vista. */
export const MODAL_STANDARDS: Readonly<Record<ModalStandardType, ModalStandardDefinition>> = {
  mainForm: createDefinition(
    'mainForm', 'Formulario principal', 'Alta y edición de registros en el sistema.',
    {
      icon: 'edit_note', subtitle: 'Registro y configuración del artículo', info: true,
      sections: ['Identificación', 'Logística', 'Finanzas'], footer: true,
      allowedActions: ['previous', 'cancel', 'primary', 'next'],
      actions: [
        action('previous', 'Anterior', 'secondary', 0),
        action('cancel', 'Cancelar', 'secondary', 1),
        action('primary', 'Guardar cambios', 'primary', 2)
      ], selectors: true
    }
  ),
  wizard: createDefinition(
    'wizard', 'Proceso guiado', 'Operación secuencial que requiere avanzar por etapas.',
    {
      icon: 'checklist', iconEnabled: true, subtitle: 'Completa cada paso para continuar', info: true,
      sections: ['Información', 'Configuración', 'Revisión'], footer: true,
      allowedActions: ['previous', 'cancel', 'next', 'primary'],
      actions: [
        action('previous', 'Anterior', 'secondary', 0),
        action('cancel', 'Cancelar', 'secondary', 1),
        action('next', 'Continuar', 'primary', 2)
      ], selectors: true
    }
  ),
  detail: createDefinition(
    'detail', 'Detalle / consulta', 'Consultar información sin modificar el registro.',
    {
      icon: 'description', subtitle: 'Consulta de información', info: true, close: true,
      footer: false, allowedActions: ['close'],
      actions: [action('close', 'Cerrar', 'secondary', 0)], selectors: false,
      selectorTypes: ['autocomplete'], selectorMotionEnabled: false
    }
  ),
  selector: createDefinition(
    'selector', 'Selector de registros', 'Buscar y elegir uno o varios registros.',
    {
      icon: 'search', subtitle: 'Busca y elige un elemento', info: true,
      footer: true, allowedActions: ['cancel', 'primary'],
      actions: [
        action('cancel', 'Cancelar', 'secondary', 0),
        action('primary', 'Seleccionar', 'primary', 1)
      ], selectors: true
    }
  ),
  confirmation: createDefinition(
    'confirmation', 'Confirmación', 'Solicitar confirmación antes de ejecutar una acción importante.',
    {
      icon: 'warning_amber', subtitle: 'Revisa la acción antes de continuar', info: false,
      footer: true, allowedActions: ['cancel', 'primary'],
      actions: [
        action('cancel', 'Cancelar', 'secondary', 0),
        action('primary', 'Confirmar', 'primary', 1)
      ], selectors: false, selectorTypes: ['combo', 'autocomplete']
    }
  ),
  informative: createDefinition(
    'informative', 'Informativo', 'Comunicar información, instrucciones o resultados.',
    {
      icon: 'info', subtitle: 'Información adicional', info: false, close: true,
      footer: false, allowedActions: ['close'],
      actions: [action('close', 'Entendido', 'secondary', 0)], selectors: false,
      selectorTypes: ['combo', 'autocomplete']
    }
  ),
  subInfo: createDefinition(
    'subInfo', 'Submodal informativo', 'Mostrar una aclaración contextual dentro de un modal principal.',
    {
      icon: 'info', subtitle: 'Detalle complementario', info: false, close: true,
      footer: false, allowedActions: ['close'],
      actions: [action('close', 'Cerrar', 'secondary', 0)], selectors: false,
      selectorTypes: ['combo', 'autocomplete']
    }
  ),
  subTask: createDefinition(
    'subTask', 'Submodal complementario', 'Completar una acción secundaria dentro del flujo principal.',
    {
      icon: 'task_alt', subtitle: 'Completa los datos necesarios', info: true,
      footer: true, allowedActions: ['cancel', 'primary'],
      actions: [
        action('cancel', 'Cancelar', 'secondary', 0),
        action('primary', 'Guardar', 'primary', 1)
      ], selectors: true
    }
  ),
  filters: createDefinition(
    'filters', 'Filtros avanzados', 'Definir criterios de búsqueda para filtrar información.',
    {
      icon: 'filter_list', subtitle: 'Define los criterios de búsqueda', info: true,
      footer: true, allowedActions: ['cancel', 'primary'],
      // Limpiar pertenece al contenido propio de cada vista, no al footer común.
      actions: [
        action('cancel', 'Cancelar', 'secondary', 0),
        action('primary', 'Aplicar filtros', 'primary', 1)
      ], selectors: true, selectorTypes: ['combo', 'autocomplete', 'date', 'multi']
    }
  )
};
