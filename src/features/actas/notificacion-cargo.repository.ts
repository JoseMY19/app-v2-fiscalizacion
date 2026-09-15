import { ModoNotificacion, type BaseCalculo } from '@pas-sjl/shared-types';
import { db, type NotificacionCargoLocal } from '../../lib/db';

/**
 * HU-13: "hereda automáticamente ... GPS ya capturados" — fechaDeteccion
 * se toma de Intervencion.fechaHoraInicio, nunca se vuelve a pedir.
 * A propósito no recibe fechaNotificacion ni modoNotificacion: son HU-20/21.
 */
export interface DatosNotificacionCargo {
  numeroCorrelativo: string;
  baseCalculo: BaseCalculo;
  montoPasibleMulta: number | null;
  medidaComplementaria?: string;
}

export async function guardarNotificacionCargo(intervencionLocalId: string, datos: DatosNotificacionCargo): Promise<void> {
  const intervencion = await db.intervenciones.get(intervencionLocalId);
  if (!intervencion) {
    throw new Error('No se encontró la intervención para heredar la fecha de detección.');
  }

  const registro: NotificacionCargoLocal = {
    intervencionLocalId,
    numeroCorrelativo: datos.numeroCorrelativo.trim(),
    baseCalculo: datos.baseCalculo,
    montoPasibleMulta: datos.montoPasibleMulta ?? undefined,
    medidaComplementaria: datos.medidaComplementaria?.trim() || undefined,
    fechaDeteccion: intervencion.fechaHoraInicio.slice(0, 10),
    creadoEn: new Date().toISOString(),
  };
  await db.notificacionesCargo.put(registro);
}

export async function obtenerNotificacionCargo(intervencionLocalId: string): Promise<NotificacionCargoLocal | undefined> {
  return db.notificacionesCargo.get(intervencionLocalId);
}

/** HU-20: negativa + testigos/domicilio; HU-21: ¿se entregó en el acto? */
export interface DatosEntregaNotificacion {
  seNegoIdentificarse: boolean;
  seNegoFirmar: boolean;
  domicilioPuertas?: string;
  domicilioPisos?: string;
  domicilioNumeroSuministro?: string;
  domicilioObservaciones?: string;
  entregadaEnElActo: boolean;
  receptorNombre?: string;
  receptorDocumento?: string;
  receptorRelacion?: string;
}

/**
 * HU-20/HU-21: SIEMPRE lee el registro completo de NotificacionCargo (ya
 * creado en HU-13) y lo fusiona — nunca lo reconstruye solo con los campos
 * de esta pantalla, porque perdería montoPasibleMulta/baseCalculo/etc.
 */
export async function guardarEntregaNotificacionCargo(
  intervencionLocalId: string,
  datos: DatosEntregaNotificacion,
): Promise<void> {
  const actual = await db.notificacionesCargo.get(intervencionLocalId);
  if (!actual) {
    throw new Error('No existe la Notificación de Cargo (HU-13) para registrar la entrega.');
  }

  const hayNegativa = datos.seNegoIdentificarse || datos.seNegoFirmar;
  const modoNotificacion = datos.entregadaEnElActo
    ? datos.seNegoFirmar
      ? ModoNotificacion.PERSONAL_NEGATIVA
      : ModoNotificacion.PERSONAL_FIRMA
    : ModoNotificacion.DOMICILIARIA_PENDIENTE;

  const registro: NotificacionCargoLocal = {
    ...actual,
    modoNotificacion,
    // NULLABLE A PROPÓSITO: si no se entregó en el acto, fechaNotificacion
    // queda vacía — nunca se completa con la fecha de emisión ni otra
    // (ver CLAUDE.md y erd-sp1-decisiones.md §2.6; dispara el motor de plazos).
    fechaNotificacion: datos.entregadaEnElActo ? new Date().toISOString() : undefined,
    receptorNombre: datos.entregadaEnElActo ? datos.receptorNombre?.trim() || undefined : undefined,
    receptorDocumento: datos.entregadaEnElActo ? datos.receptorDocumento?.trim() || undefined : undefined,
    receptorRelacion: datos.entregadaEnElActo ? datos.receptorRelacion?.trim() || undefined : undefined,
    seNegoIdentificarse: datos.seNegoIdentificarse,
    seNegoFirmar: datos.seNegoFirmar,
    domicilioPuertas: hayNegativa ? datos.domicilioPuertas?.trim() || undefined : undefined,
    domicilioPisos: hayNegativa ? datos.domicilioPisos?.trim() || undefined : undefined,
    domicilioNumeroSuministro: hayNegativa ? datos.domicilioNumeroSuministro?.trim() || undefined : undefined,
    domicilioObservaciones: hayNegativa ? datos.domicilioObservaciones?.trim() || undefined : undefined,
  };
  await db.notificacionesCargo.put(registro);
}
