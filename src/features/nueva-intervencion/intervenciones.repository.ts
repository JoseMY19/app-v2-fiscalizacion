import { EstadoIntervencion, OrigenIntervencion, OrigenUbicacion, TipoActuacion } from '@pas-sjl/shared-types';
import { db, type IntervencionLocal } from '../../lib/db';
import { obtenerFiscalizadorActivo } from '../auth/auth.repository';
import { generarUuid } from '../../lib/uuid';

/**
 * HU-01: alta de una intervención con su ubicación inicial.
 * Exactamente una de las dos vías de ubicación (GPS o dirección manual)
 * debe estar presente — ver la nota técnica de HU-01 en el backlog sobre
 * bloquear el avance si fallan ambas.
 */
export type UbicacionInicial =
  | {
      origenUbicacion: OrigenUbicacion.GPS_AUTOMATICO;
      latitud: number;
      longitud: number;
      gpsPrecisionM: number;
      // Referencia legible para el expediente; las coordenadas siguen siendo la ubicación oficial.
      direccionAproximada?: string;
    }
  | { origenUbicacion: OrigenUbicacion.DIRECCION_MANUAL; direccionAproximada: string };

export async function crearIntervencionConUbicacion(ubicacion: UbicacionInicial): Promise<string> {
  const ahora = new Date().toISOString();
  const localId = generarUuid();

  const registro: IntervencionLocal = {
    localId,
    // HU-24: se graba al crear (no se recalcula al sincronizar) para que
    // la intervención conserve quién la hizo aunque el dispositivo cambie
    // de fiscalizador después. undefined si "¿Quién eres?" no corrió
    // todavía (no debería pasar: App.tsx lo exige antes de esta pantalla).
    fiscalizadorId: obtenerFiscalizadorActivo() ?? undefined,
    fechaHoraInicio: ahora,
    estado: EstadoIntervencion.BORRADOR,
    versionLocal: 1,
    creadoEn: ahora,
    actualizadoEn: ahora,
    origenUbicacion: ubicacion.origenUbicacion,
    ...(ubicacion.origenUbicacion === OrigenUbicacion.GPS_AUTOMATICO
      ? {
          latitud: ubicacion.latitud,
          longitud: ubicacion.longitud,
          gpsPrecisionM: ubicacion.gpsPrecisionM,
          direccionAproximada: ubicacion.direccionAproximada,
        }
      : { direccionAproximada: ubicacion.direccionAproximada }),
  };

  await db.intervenciones.add(registro);
  return localId;
}

/**
 * HU-03: la referencia es obligatoria salvo en INOPINADA — se valida aquí
 * también (no solo en el formulario) porque es un invariante del dato, no
 * una regla de presentación.
 */
export async function actualizarOrigenIntervencion(
  localId: string,
  origen: OrigenIntervencion,
  referenciaOrigen?: string,
): Promise<void> {
  const referenciaLimpia = referenciaOrigen?.trim() || undefined;
  if (origen !== OrigenIntervencion.INOPINADA && !referenciaLimpia) {
    throw new Error('referenciaOrigen es obligatoria salvo cuando el origen es INOPINADA');
  }

  await db.intervenciones.update(localId, {
    origen,
    referenciaOrigen: origen === OrigenIntervencion.INOPINADA ? undefined : referenciaLimpia,
    actualizadoEn: new Date().toISOString(),
  });
}

/** HU-10: registra el camino elegido (A=EXHORTACION, B=CONSTATACION, C=INICIA_PAS). */
export async function seleccionarCaminoIntervencion(localId: string, tipoActuacion: TipoActuacion): Promise<void> {
  await db.intervenciones.update(localId, {
    tipoActuacion,
    actualizadoEn: new Date().toISOString(),
  });
}

/**
 * HU-15/HU-21: cierra la intervención en cualquier camino. En A/B nunca
 * exige NC ni AFM — esa exigencia cruzada era el defecto del prototipo
 * anterior. En C, exige que HU-21 ya haya respondido "¿se entregó en el
 * acto?" (modoNotificacion presente) — DOMICILIARIA_PENDIENTE con
 * fechaNotificacion null es un estado final válido para cerrar, no "falta
 * algo": así lo define el propio HU-21 (dispara el motor de plazos).
 */
export async function finalizarIntervencion(localId: string, tipoActuacion: TipoActuacion): Promise<void> {
  if (tipoActuacion === TipoActuacion.INICIA_PAS) {
    const nc = await db.notificacionesCargo.get(localId);
    if (!nc?.modoNotificacion) {
      throw new Error('Falta responder si la Notificación de Cargo se entregó en el acto (HU-21) antes de cerrar.');
    }
  }

  await db.intervenciones.update(localId, {
    estado: EstadoIntervencion.PENDIENTE_SYNC,
    actualizadoEn: new Date().toISOString(),
  });
}

/** Resumen de la intervención más reciente, para la fila "Última intervención" del inicio. */
export interface UltimaIntervencion {
  localId: string;
  identificado: boolean;
  camino: TipoActuacion;
}

/**
 * La intervención cerrada más reciente del fiscalizador activo, leída de
 * Dexie para que el inicio la muestre aunque se recargue la app. Las
 * BORRADOR (wizard sin terminar) no cuentan. El registro de Intervencion
 * se conserva tras sincronizar (solo se purga la evidencia), así que
 * también aparecen las ya enviadas.
 */
export async function obtenerUltimaIntervencion(): Promise<UltimaIntervencion | null> {
  const fiscalizadorId = obtenerFiscalizadorActivo();
  const ultima = await db.intervenciones
    .orderBy('creadoEn')
    .reverse()
    .filter(
      (i) =>
        i.estado !== EstadoIntervencion.BORRADOR &&
        i.tipoActuacion !== undefined &&
        (!i.fiscalizadorId || i.fiscalizadorId === fiscalizadorId),
    )
    .first();
  if (!ultima?.tipoActuacion) return null;

  const administrado = await db.administrados.get(ultima.localId);
  return {
    localId: ultima.localId,
    identificado: administrado?.identificado ?? false,
    camino: ultima.tipoActuacion,
  };
}
