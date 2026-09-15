import { db, type ColaSincronizacion } from '../../lib/db';

/**
 * HU-25: "usa db.colaSincronizacion, ya está en el esquema" — CRUD sobre
 * esa tabla, nunca escrita hasta ahora. Es autocurativa: cualquier
 * Intervencion en PENDIENTE_SYNC sin fila propia la recibe al escanear
 * (ver motor-sincronizacion.ts), así ninguna pantalla necesita acordarse
 * de "avisarle" a la cola.
 */
export async function asegurarEnCola(intervencionLocalId: string): Promise<void> {
  const existente = await db.colaSincronizacion.where('intervencionLocalId').equals(intervencionLocalId).first();
  if (!existente) {
    await db.colaSincronizacion.add({ intervencionLocalId, intentoNumero: 0, estado: 'PENDIENTE' });
  }
}

export async function listarPendientes(): Promise<ColaSincronizacion[]> {
  return db.colaSincronizacion.where('estado').anyOf('PENDIENTE', 'ERROR').toArray();
}

export async function contarPendientes(): Promise<number> {
  return db.colaSincronizacion.where('estado').anyOf('PENDIENTE', 'ERROR').count();
}

export async function obtenerEntrada(intervencionLocalId: string): Promise<ColaSincronizacion | undefined> {
  return db.colaSincronizacion.where('intervencionLocalId').equals(intervencionLocalId).first();
}

export async function registrarIntento(
  intervencionLocalId: string,
  resultado: { exito: boolean; detalleError?: string },
): Promise<void> {
  const fila = await obtenerEntrada(intervencionLocalId);
  const intentoNumero = (fila?.intentoNumero ?? 0) + 1;
  const cambios: Partial<ColaSincronizacion> = {
    intentoNumero,
    ultimoIntentoEn: new Date().toISOString(),
    estado: resultado.exito ? 'OK' : 'ERROR',
    detalleError: resultado.detalleError,
  };

  if (fila?.id !== undefined) {
    await db.colaSincronizacion.update(fila.id, cambios);
  } else {
    await db.colaSincronizacion.add({ intervencionLocalId, ...cambios } as ColaSincronizacion);
  }
}

/** Se llama cuando la intervención terminó de sincronizar del todo (bundle + evidencia). */
export async function limpiarCola(intervencionLocalId: string): Promise<void> {
  await db.colaSincronizacion.where('intervencionLocalId').equals(intervencionLocalId).delete();
}
