import { TipoActuacion } from '@pas-sjl/shared-types';
import { FOTOS_MINIMO } from '../evidencia/fotos.repository';

export type SeccionWizard =
  | 'origen'
  | 'administrado'
  | 'cuis'
  | 'acta-exhortacion'
  | 'acta-fiscalizacion'
  | 'notificacion-cargo'
  | 'notificacion-entrega'
  | 'fotos'
  | 'firma';

export interface Faltante {
  seccion: SeccionWizard;
  mensaje: string;
}

export interface DatosParaResumen {
  tipoActuacion: TipoActuacion | undefined;
  totalCuisSeleccionados: number;
  tieneActaExhortacion: boolean;
  tieneActaFiscalizacion: boolean;
  tieneNotificacionCargo: boolean;
  // HU-21: si ya se respondió "¿se entregó en el acto?" (modoNotificacion presente).
  tieneRespuestaEntregaNc: boolean;
  totalFotos: number;
  tieneFirmaInspector: boolean;
  /**
   * V-02: en modo corrección se omite la exigencia de fotos/firma. El
   * validador ya vio esa evidencia en el bundle que revisó — si observó el
   * expediente fue por otra cosa (ver erd-sp1-decisiones.md §2.11). Además
   * HU-26 purga las filas de fotos/firma de Dexie apenas la intervención
   * sincroniza, así que en modo corrección el conteo local siempre daría
   * cero, aunque la evidencia exista intacta en el servidor. Default
   * `false` — cero cambio de comportamiento en el flujo normal.
   */
  omitirEvidencia?: boolean;
}

/**
 * HU-19: "resalta cualquier campo obligatorio faltante" — pero lo
 * obligatorio depende del camino (HU-10) ya elegido. Nunca se exige AFM+NC
 * en los caminos A/B (HU-15); Exhortación solo aplica en A.
 */
export function calcularFaltantes(datos: DatosParaResumen): Faltante[] {
  const faltantes: Faltante[] = [];

  if (datos.totalCuisSeleccionados === 0) {
    faltantes.push({ seccion: 'cuis', mensaje: 'No se seleccionó ningún código CUIS.' });
  }

  if (datos.tipoActuacion === TipoActuacion.EXHORTACION && !datos.tieneActaExhortacion) {
    faltantes.push({ seccion: 'acta-exhortacion', mensaje: 'Falta el Acta de Exhortación.' });
  }

  if (
    (datos.tipoActuacion === TipoActuacion.CONSTATACION || datos.tipoActuacion === TipoActuacion.INICIA_PAS) &&
    !datos.tieneActaFiscalizacion
  ) {
    faltantes.push({ seccion: 'acta-fiscalizacion', mensaje: 'Falta el Acta de Fiscalización Municipal.' });
  }

  if (datos.tipoActuacion === TipoActuacion.INICIA_PAS && !datos.tieneNotificacionCargo) {
    faltantes.push({ seccion: 'notificacion-cargo', mensaje: 'Falta la Notificación de Cargo.' });
  }

  if (datos.tipoActuacion === TipoActuacion.INICIA_PAS && datos.tieneNotificacionCargo && !datos.tieneRespuestaEntregaNc) {
    faltantes.push({
      seccion: 'notificacion-entrega',
      mensaje: 'Falta indicar si la Notificación de Cargo se entregó en el acto (HU-21).',
    });
  }

  if (!datos.omitirEvidencia && datos.totalFotos < FOTOS_MINIMO) {
    faltantes.push({ seccion: 'fotos', mensaje: `Falta al menos ${FOTOS_MINIMO} fotografía.` });
  }

  if (!datos.omitirEvidencia && !datos.tieneFirmaInspector) {
    faltantes.push({ seccion: 'firma', mensaje: 'Falta la firma del inspector.' });
  }

  return faltantes;
}
