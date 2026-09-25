/*
 * Primitivas visuales compartidas como cadenas de utilidades Tailwind.
 * Reemplazan las antiguas clases de main.css (.btn, .card, .form-input...)
 * manteniendo el mismo aspecto. Las piezas de un solo uso viven directo
 * en su componente.
 */
import { cn } from './cn';

// ---------- Layout ----------
/** Contenedor principal de cada pantalla (antes .app-container). */
export const appContainer = 'w-full max-w-[480px] mx-auto pt-[4.75rem] px-4 pb-[5.5rem] flex-1 relative z-[1]';

// ---------- Botones ----------
type BtnVariante = 'primary' | 'secondary' | 'outline' | 'danger' | 'danger-solid';
type BtnTamano = 'sm' | 'md' | 'lg';

const btnBase =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-md border border-solid cursor-pointer select-none no-underline ' +
  'transition-[background-color,border-color,box-shadow,transform] duration-150 not-disabled:active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const btnTamanos: Record<BtnTamano, string> = {
  md: 'px-[1.125rem] py-2.5 text-[0.9375rem] min-h-11',
  sm: 'px-3 py-1.5 text-[0.8125rem] min-h-[34px]',
  lg: 'px-6 py-3.5 text-base min-h-12',
};

const btnVariantes: Record<BtnVariante, string> = {
  primary:
    'bg-primary-600 text-white border-primary-600 shadow-[0_1px_2px_rgba(16,31,77,0.2)] ' +
    'not-disabled:hover:bg-primary-700 not-disabled:hover:border-primary-700 focus-visible:outline-none focus-visible:shadow-focus',
  secondary: 'bg-bg-subtle text-text-body border-border not-disabled:hover:bg-bg-raised',
  outline: 'bg-white text-primary-600 border-primary-300 not-disabled:hover:bg-primary-50 not-disabled:hover:border-primary-600',
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
  'transition-colors duration-150 not-disabled:hover:bg-bg-subtle not-disabled:hover:text-text-title disabled:opacity-40 disabled:cursor-not-allowed';

/** Botón cuadrado de volver en cabeceras de pantalla (antes .btn-icon-back). */
export const btnIconBack =
  'w-9 h-9 rounded-md border border-solid border-border bg-white text-primary-700 flex items-center justify-center cursor-pointer shrink-0 ' +
  'transition-all duration-150 hover:bg-primary-50 hover:border-primary-300 active:scale-95';

// ---------- Tarjetas ----------
const cardBase =
  'bg-bg-card border border-solid rounded-lg p-5 mb-4 shadow-xs relative z-[2] transition-[box-shadow,border-color] duration-150';
/** Tarjeta (antes .card, .card--highlight, .card--warning). */
export function card(variante: 'default' | 'highlight' | 'warning' = 'default'): string {
  if (variante === 'warning') return cn(cardBase, 'border-warning-border border-l-4 border-l-warning bg-white');
  if (variante === 'highlight')
    return cn(cardBase, 'border-border hover:border-border-hover border-l-4 border-l-primary-600 hover:border-l-primary-600');
  return cn(cardBase, 'border-border hover:border-border-hover');
}

// ---------- Cabecera de pantalla secundaria ----------
export const screenHeaderCard =
  'flex items-center gap-3 bg-white border border-solid border-border rounded-lg px-4 py-3.5 mb-4 shadow-xs relative z-[2]';
export const screenHeaderInfo = 'flex-1 min-w-0';
export const screenHeaderTitle = 'text-[1.0625rem] font-bold text-text-title m-0 mb-0.5 leading-tight';
export const screenHeaderSubtitle = 'text-xs text-text-muted m-0';

// ---------- Etiquetas de sección ----------
export const sectionLabel = 'text-sm font-bold text-text-title mb-3 flex items-center gap-1';
export const sectionLabelRequired = 'text-danger';

// ---------- Formularios ----------
export const formGroup = 'mb-4 flex flex-col';
export const formLabel = 'block text-sm font-semibold text-text-title mb-1.5';
/** Añade " *" rojo al final de la etiqueta (antes .form-label-required). */
export const formLabelRequired = "after:content-['_*'] after:text-danger";

const campoBase =
  'w-full font-[inherit] text-[0.9375rem] text-text-title bg-white border-[1.5px] border-solid border-border rounded-md px-3.5 py-2.5 ' +
  'transition-[border-color,box-shadow] duration-150 outline-none focus:border-primary-600 focus:shadow-focus';

export const formInput =
  campoBase +
  ' min-h-11 placeholder:text-text-light read-only:bg-bg-subtle read-only:text-text-muted read-only:cursor-default read-only:border-border';
export const formSelect = campoBase + ' min-h-11';
export const formTextarea = campoBase + ' resize-y min-h-20 placeholder:text-text-light';
export const formHint = 'text-xs text-text-muted mt-1';

// ---------- Tarjetas de opción (radio visual) ----------
export const optionsGrid = 'flex flex-col gap-2.5 mb-4';

export function optionCard(seleccionada: boolean): string {
  return cn(
    'flex items-center gap-3.5 px-4 py-3.5 border-[1.5px] border-solid rounded-md cursor-pointer transition-all duration-150 select-none',
    seleccionada
      ? 'border-primary-600 bg-primary-50 shadow-[0_0_0_1px_var(--color-primary-600)]'
      : 'border-border bg-white hover:border-primary-300 hover:bg-primary-50',
  );
}

export function optionRadio(seleccionada: boolean): string {
  return cn(
    'w-5 h-5 rounded-full border-2 border-solid flex items-center justify-center shrink-0 transition-colors duration-150',
    seleccionada ? 'border-primary-600' : 'border-border-hover',
  );
}

export function optionRadioDot(seleccionada: boolean): string {
  return cn(
    'w-2.5 h-2.5 rounded-full bg-primary-600 transition-[transform,opacity] duration-150',
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
  primary: 'bg-primary-100 text-primary-800',
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
const alertBase = 'px-4 py-3.5 rounded-md mb-4 text-sm flex items-start gap-2.5 leading-[1.4]';
const alertVariantes: Record<AlertVariante, string> = {
  warning: 'bg-warning-bg border border-solid border-warning-border text-warning',
  error: 'bg-danger-bg border border-solid border-danger-border text-danger',
  info: 'bg-accent-100 border border-solid border-primary-200 text-primary-700',
  success: 'bg-success-bg border border-solid border-success-border text-success',
};
export function alerta(variante: AlertVariante): string {
  return cn(alertBase, alertVariantes[variante]);
}

// ---------- Aviso de saneamiento ----------
export const saneamientoNotice =
  'flex items-start gap-3 bg-warning-bg border border-solid border-warning-border rounded-md px-4 py-3.5 mb-5';
export const saneamientoNoticeIcon = 'text-warning shrink-0 mt-0.5';
export const saneamientoNoticeTitle = 'text-sm font-bold text-warning mb-[0.2rem]';
export const saneamientoNoticeDesc = 'text-[0.8125rem] text-text-body leading-[1.4]';

// ---------- GPS ----------
export const cardIconPin =
  'w-[30px] h-[30px] rounded-md bg-primary-50 text-primary-700 flex items-center justify-center shrink-0';
export const gpsStatusChip =
  'inline-flex items-center gap-[0.35rem] bg-success-bg text-success border border-solid border-success-border px-[0.65rem] py-1 rounded-pill text-xs font-bold tracking-[0.01em]';
export const gpsStatusChipDot = 'w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_0_2px_rgba(10,122,76,0.2)]';
export const gpsPrecisionPill =
  'flex items-center gap-2 bg-bg-subtle border border-solid border-border rounded-md px-3.5 py-2.5 text-sm font-semibold text-text-title w-full';
export const gpsPulseContainer =
  'flex items-center gap-3 p-4 bg-primary-50 border border-solid border-primary-200 rounded-md mb-4';
export const pulseDot =
  'w-3 h-3 bg-primary-600 rounded-full relative ' +
  "after:content-[''] after:absolute after:-inset-1 after:rounded-full after:border-2 after:border-solid after:border-primary-500 after:animate-pulse-ring";

// ---------- Fotos ----------
export const photoGrid = 'grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3 my-4';
export const photoItem = 'relative aspect-square rounded-md overflow-hidden border border-solid border-border shadow-xs';
export const photoItemImg = 'w-full h-full object-cover block';
export const photoItemRemove =
  'absolute top-1 right-1 w-[26px] h-[26px] rounded-full bg-[rgba(220,38,38,0.9)] text-white border-none flex items-center justify-center cursor-pointer text-[14px] font-bold';

// ---------- Firma ----------
export const signatureBox = 'bg-white border-2 border-dashed border-primary-300 rounded-lg p-3 mb-4 text-center';
export const signatureCanvas = 'w-full max-w-[440px] h-[180px] bg-white rounded-md touch-none cursor-crosshair';

// ---------- Acciones ----------
/** Pie de acciones; en >=640px los botones pasan a fila y ancho automático. */
export const actionsFooter =
  'flex flex-col gap-2.5 mt-6 pt-4 border-t border-solid border-border sm:flex-row sm:justify-end sm:[&>button]:w-auto';
export const actionsRow = 'flex gap-3 [&>*]:flex-1';

// ---------- Listas ----------
export const customList = 'list-none flex flex-col gap-2.5 my-3';
export const customListItem = 'bg-white border border-solid border-border rounded-md p-3.5 flex flex-col gap-1.5';
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
