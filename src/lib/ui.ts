/*
 * Primitivas visuales compartidas como cadenas de utilidades Tailwind.
 * Reemplazan las antiguas clases de main.css (.btn, .card, .form-input...)
 * manteniendo el mismo aspecto. Las piezas de un solo uso viven directo
 * en su componente.
 */
import { cn } from './cn';

// ---------- Layout ----------
/** Contenedor principal de cada pantalla (antes .app-container). */
export const appContainer = 'w-full max-w-[480px] mx-auto pt-[4.75rem] px-4 pb-[6.5rem] flex-1 relative z-[1]';

// ---------- Botones ----------
type BtnVariante = 'primary' | 'secondary' | 'outline' | 'danger' | 'danger-solid';
type BtnTamano = 'sm' | 'md' | 'lg';

const btnBase =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-pill border border-solid cursor-pointer select-none no-underline ' +
  'transition-[background-color,border-color,box-shadow,transform] duration-150 not-disabled:active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const btnTamanos: Record<BtnTamano, string> = {
  md: 'px-[1.125rem] py-2.5 text-[0.9375rem] min-h-11',
  sm: 'px-3 py-1.5 text-[0.8125rem] min-h-[34px]',
  lg: 'px-6 py-3.5 text-base font-bold min-h-[52px]',
};

const btnVariantes: Record<BtnVariante, string> = {
  primary:
    'bg-linear-135 from-campo-700 to-campo-900 text-white border-transparent shadow-[0_8px_20px_-6px_rgba(101,10,64,0.5)] ' +
    'not-disabled:hover:shadow-[0_10px_24px_-6px_rgba(101,10,64,0.6)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-campo-100 disabled:shadow-none',
  secondary:
    'bg-white text-text-body border-border not-disabled:hover:bg-campo-50 not-disabled:hover:border-campo-200 not-disabled:hover:text-campo-700',
  outline: 'bg-white text-campo-700 border-campo-200 not-disabled:hover:bg-campo-50 not-disabled:hover:border-campo-600',
  danger: 'bg-danger-bg text-danger border-danger-border not-disabled:hover:bg-[#f5d5d3]',
  'danger-solid': 'bg-danger text-white border-danger not-disabled:hover:bg-[#8f1e18]',
};

export function btn(
  variante: BtnVariante,
  opciones: { tamano?: BtnTamano; block?: boolean } = {},
): string {
  return cn(btnBase, btnTamanos[opciones.tamano ?? 'md'], btnVariantes[variante], opciones.block && 'w-full');
}

/** Botón "volver" de texto (antes .btn-back). */
export const btnBack =
  'inline-flex items-center gap-1.5 bg-transparent border-none text-text-muted text-sm font-semibold cursor-pointer px-2.5 py-1.5 rounded-sm mb-3 ' +
  'transition-colors duration-150 not-disabled:hover:bg-campo-50 not-disabled:hover:text-campo-700 disabled:opacity-40 disabled:cursor-not-allowed';

/** Botón cuadrado de volver en cabeceras de pantalla (antes .btn-icon-back). */
export const btnIconBack =
  'w-10 h-10 rounded-full border border-solid border-campo-100 bg-campo-50 text-campo-700 flex items-center justify-center cursor-pointer shrink-0 ' +
  'transition-all duration-150 hover:bg-campo-100 active:scale-95';

// ---------- Tarjetas ----------
const cardBase =
  'bg-bg-card border border-solid rounded-[18px] p-4 mb-4 shadow-[0_6px_20px_-6px_rgba(14,26,59,0.12),0_1px_3px_rgba(14,26,59,0.05)] relative z-[2] transition-[box-shadow,border-color] duration-150';
/** Tarjeta (antes .card, .card--highlight, .card--warning). */
export function card(variante: 'default' | 'highlight' | 'warning' = 'default'): string {
  if (variante === 'warning') return cn(cardBase, 'border-warning-border border-l-4 border-l-warning bg-white');
  if (variante === 'highlight') return cn(cardBase, 'border-black/[0.04] border-l-4 border-l-campo-600');
  return cn(cardBase, 'border-black/[0.04]');
}

/**
 * Tarjeta suave: blanca, muy redondeada, sin borde marcado y con sombra
 * difusa (inicio, mis trámites). Lenguaje visual del área Fiscalización de Campo.
 */
export const tarjetaSuave =
  'bg-white border border-solid border-black/[0.04] rounded-[18px] shadow-[0_6px_20px_-6px_rgba(14,26,59,0.12),0_1px_3px_rgba(14,26,59,0.05)] relative z-[2]';
/** Recuadro pastel del ícono dentro de una tarjeta suave (el color va aparte). */
export const iconoTarjeta = 'w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0';

/** Tarjeta hero magenta (inicio, perfil): brillos difuminados de la paleta SJL detrás del contenido. */
export const tarjetaHero =
  'relative overflow-hidden isolate rounded-[18px] text-white ' +
  'bg-[linear-gradient(135deg,var(--color-campo-700)_0%,var(--color-campo-800)_55%,var(--color-campo-900)_100%)] shadow-[0_10px_28px_-8px_rgba(101,10,64,0.6)]';
export const brilloHero = 'absolute rounded-full blur-3xl';
/** Chip translúcido sobre la tarjeta hero. */
export const chipHero =
  'inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/15 border border-solid border-white/20 backdrop-blur-sm text-white text-[0.725rem] font-bold';

/** Botón principal del área de campo: cápsula magenta (asistente de intervención). */
export const btnCampo =
  'w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-pill border-none cursor-pointer select-none ' +
  'bg-linear-135 from-campo-700 to-campo-900 text-white text-base font-bold shadow-[0_8px_20px_-6px_rgba(101,10,64,0.5)] ' +
  'transition-[transform,box-shadow,opacity] duration-150 not-disabled:hover:shadow-[0_10px_24px_-6px_rgba(101,10,64,0.6)] not-disabled:active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-campo-100 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none';
/** Botón secundario en cápsula (cancelar, reintentar). */
export const btnCampoSecundario =
  'w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-pill border border-solid border-border bg-white cursor-pointer select-none ' +
  'text-[0.9375rem] font-semibold text-text-body transition-[background-color,border-color,transform] duration-150 ' +
  'not-disabled:hover:bg-campo-50 not-disabled:hover:border-campo-200 not-disabled:hover:text-campo-700 not-disabled:active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

// Campo "relleno" (login, asistente): ícono en recuadro a la izquierda, etiqueta pequeña arriba del valor.
export const campoRelleno =
  'group flex items-center gap-3 bg-bg-subtle border-[1.5px] border-solid border-border rounded-[14px] px-3 py-2.5 cursor-text ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ' +
  'focus-within:bg-white focus-within:border-campo-600 focus-within:shadow-[0_0_0_3px_rgba(163,38,109,0.18)]';
export const campoRellenoIcono =
  'w-10 h-10 rounded-[10px] bg-white border border-solid border-border text-text-muted flex items-center justify-center shrink-0 ' +
  'transition-colors duration-150 group-focus-within:text-campo-700 group-focus-within:border-campo-200 group-focus-within:bg-campo-50';
export const campoRellenoEtiqueta = 'block text-xs font-medium text-text-muted mb-0.5';
export const campoRellenoInput =
  'w-full bg-transparent border-none outline-none p-0 text-base font-semibold text-text-title tracking-[0.01em] caret-campo-700 placeholder:text-text-light placeholder:font-normal';

// Opción seleccionable con ícono (asistente): recuadro de ícono a la izquierda y check a la derecha.
export function opcionTarjeta(seleccionada: boolean): string {
  return cn(
    'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] border-[1.5px] border-solid text-left cursor-pointer select-none ' +
      'transition-[border-color,background-color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-campo-100',
    seleccionada
      ? 'border-campo-600 bg-campo-50 shadow-[0_6px_16px_-8px_rgba(101,10,64,0.35)]'
      : 'border-border bg-white hover:border-campo-200 hover:bg-campo-50/40',
  );
}
export function opcionIcono(seleccionada: boolean): string {
  return cn(
    'w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition-colors duration-150',
    seleccionada ? 'bg-linear-135 from-campo-700 to-campo-900 text-white' : 'bg-bg-subtle text-text-muted',
  );
}
export function opcionCheck(seleccionada: boolean): string {
  return cn(
    'w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 border-solid transition-all duration-150',
    seleccionada ? 'bg-campo-700 border-campo-700 text-white scale-100' : 'border-border-hover text-transparent',
  );
}

// ---------- Cabecera de pantalla secundaria ----------
export const screenHeaderCard =
  'flex items-center gap-3 bg-white border border-solid border-black/[0.04] rounded-[18px] px-4 py-3.5 mb-4 shadow-[0_6px_20px_-6px_rgba(14,26,59,0.12),0_1px_3px_rgba(14,26,59,0.05)] relative z-[2]';
export const screenHeaderInfo = 'flex-1 min-w-0';
export const screenHeaderTitle = 'text-[1.0625rem] font-bold text-text-title m-0 mb-0.5 leading-tight';
export const screenHeaderSubtitle = 'text-xs text-text-muted m-0';

// ---------- Etiquetas de sección ----------
export const sectionLabel = 'text-[0.9375rem] font-bold text-text-title mb-3 flex items-center gap-1';
export const sectionLabelRequired = 'text-danger';

// ---------- Formularios ----------
export const formGroup = 'mb-4 flex flex-col';
export const formLabel = 'block text-sm font-semibold text-text-title mb-1.5';
/** Añade " *" rojo al final de la etiqueta (antes .form-label-required). */
export const formLabelRequired = "after:content-['_*'] after:text-danger";

const campoBase =
  'w-full font-[inherit] text-[0.9375rem] text-text-title bg-bg-subtle border-[1.5px] border-solid border-border rounded-[14px] px-3.5 py-2.5 caret-campo-700 ' +
  'transition-[border-color,box-shadow,background-color] duration-150 outline-none ' +
  'focus:bg-white focus:border-campo-600 focus:shadow-[0_0_0_3px_rgba(163,38,109,0.18)]';

export const formInput =
  campoBase +
  ' min-h-12 placeholder:text-text-light read-only:bg-bg-raised read-only:text-text-muted read-only:cursor-default read-only:border-border';
export const formSelect = campoBase + ' min-h-12 accent-campo-700';
export const formTextarea = campoBase + ' resize-y min-h-20 placeholder:text-text-light';
export const formHint = 'text-xs text-text-muted mt-1';

// ---------- Tarjetas de opción (radio visual) ----------
export const optionsGrid = 'flex flex-col gap-2.5 mb-4';

export function optionCard(seleccionada: boolean): string {
  return cn(
    'flex items-center gap-3.5 px-4 py-3.5 border-[1.5px] border-solid rounded-[16px] cursor-pointer transition-all duration-150 select-none',
    seleccionada
      ? 'border-campo-600 bg-campo-50 shadow-[0_6px_16px_-8px_rgba(101,10,64,0.35)]'
      : 'border-border bg-white hover:border-campo-200 hover:bg-campo-50/40',
  );
}

export function optionRadio(seleccionada: boolean): string {
  return cn(
    'w-5 h-5 rounded-full border-2 border-solid flex items-center justify-center shrink-0 transition-colors duration-150',
    seleccionada ? 'border-campo-700' : 'border-border-hover',
  );
}

export function optionRadioDot(seleccionada: boolean): string {
  return cn(
    'w-2.5 h-2.5 rounded-full bg-campo-700 transition-[transform,opacity] duration-150',
    seleccionada ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
  );
}

export const optionCardContent = 'flex-1';
export const optionCardTitle = 'text-[0.9375rem] font-semibold text-text-title leading-[1.3]';
export const optionCardDesc = 'text-[0.8125rem] text-text-muted mt-0.5';

// ---------- Badges ----------
type BadgeVariante = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
const badgeBase =
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-semibold leading-none whitespace-nowrap';
const badgeVariantes: Record<BadgeVariante, string> = {
  primary: 'bg-campo-50 text-campo-700 border border-solid border-campo-100',
  success: 'bg-success-bg text-success border border-solid border-success-border',
  warning: 'bg-warning-bg text-warning border border-solid border-warning-border',
  danger: 'bg-danger-bg text-danger border border-solid border-danger-border',
  neutral: 'bg-bg-subtle text-text-muted border border-solid border-border',
};
export function badge(variante: BadgeVariante): string {
  return cn(badgeBase, badgeVariantes[variante]);
}

// ---------- Alertas ----------
type AlertVariante = 'warning' | 'error' | 'info' | 'success';
const alertBase = 'px-4 py-3.5 rounded-[14px] mb-4 text-sm flex items-start gap-2.5 leading-[1.4]';
const alertVariantes: Record<AlertVariante, string> = {
  warning: 'bg-warning-bg border border-solid border-warning-border text-warning',
  error: 'bg-danger-bg border border-solid border-danger-border text-danger',
  info: 'bg-campo-50 border border-solid border-campo-100 text-campo-800',
  success: 'bg-success-bg border border-solid border-success-border text-success',
};
export function alerta(variante: AlertVariante): string {
  return cn(alertBase, alertVariantes[variante]);
}

// ---------- Aviso de saneamiento ----------
export const saneamientoNotice =
  'flex items-start gap-3 bg-warning-bg border border-solid border-warning-border rounded-[14px] px-4 py-3.5 mb-5';
export const saneamientoNoticeIcon = 'text-warning shrink-0 mt-0.5';
export const saneamientoNoticeTitle = 'text-sm font-bold text-warning mb-[0.2rem]';
export const saneamientoNoticeDesc = 'text-[0.8125rem] text-text-body leading-[1.4]';

// ---------- GPS ----------
export const cardIconPin =
  'w-10 h-10 rounded-[12px] bg-campo-50 text-campo-700 flex items-center justify-center shrink-0';
export const gpsStatusChip =
  'inline-flex items-center gap-[0.35rem] bg-success-bg text-success border border-solid border-success-border px-[0.65rem] py-1 rounded-pill text-xs font-bold tracking-[0.01em]';
export const gpsStatusChipDot = 'w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_0_2px_rgba(10,122,76,0.2)]';
export const gpsPrecisionPill =
  'flex items-center gap-2 bg-bg-subtle border border-solid border-border rounded-[14px] px-3.5 py-2.5 text-sm font-semibold text-text-title w-full';
export const gpsPulseContainer =
  'flex items-center gap-3 p-4 bg-campo-50 border border-solid border-campo-100 rounded-[14px] mb-4';
export const pulseDot =
  'w-3 h-3 bg-campo-700 rounded-full relative ' +
  "after:content-[''] after:absolute after:-inset-1 after:rounded-full after:border-2 after:border-solid after:border-campo-600 after:animate-pulse-ring";

// ---------- Fotos ----------
export const photoGrid = 'grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3 my-4';
export const photoItem = 'relative aspect-square rounded-[14px] overflow-hidden border border-solid border-border shadow-xs';
export const photoItemImg = 'w-full h-full object-cover block';
export const photoItemRemove =
  'absolute top-1 right-1 w-[26px] h-[26px] rounded-full bg-[rgba(220,38,38,0.9)] text-white border-none flex items-center justify-center cursor-pointer text-[14px] font-bold';

// ---------- Firma ----------
export const signatureBox = 'bg-white border-2 border-dashed border-campo-200 rounded-[16px] p-3 mb-4 text-center';
export const signatureCanvas = 'w-full max-w-[440px] h-[180px] bg-white rounded-[12px] touch-none cursor-crosshair';

// ---------- Acciones ----------
/** Pie de acciones; en >=640px los botones pasan a fila y ancho automático. */
export const actionsFooter =
  'flex flex-col gap-2.5 mt-6 sm:flex-row sm:justify-end sm:[&>button]:w-auto';
export const actionsRow = 'flex gap-3 [&>*]:flex-1';

// ---------- Listas ----------
export const customList = 'list-none flex flex-col gap-2.5 my-3';
export const customListItem = 'bg-white border border-solid border-border rounded-[14px] p-3.5 flex flex-col gap-1.5';
export const customListItemHeader = 'flex items-center justify-between gap-2';

// ---------- KPI chips ----------
type ChipVariante = 'success' | 'warning' | 'neutral';
const chipVariantes: Record<ChipVariante, string> = {
  success: 'bg-success-bg text-success border border-solid border-success-border',
  warning: 'bg-warning-bg text-warning border border-solid border-warning-border',
  neutral: 'bg-bg-subtle text-text-muted border border-solid border-border',
};
export function kpiChip(variante: ChipVariante): string {
  return cn(
    'text-[0.7rem] font-bold px-2 py-[0.2rem] rounded-pill leading-none tracking-[0.01em] whitespace-nowrap',
    chipVariantes[variante],
  );
}
