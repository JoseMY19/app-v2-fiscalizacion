import { db, type FirmaLocal } from '../../lib/db';

/**
 * HU-18: captura de firmas por rol (INSPECTOR y ADMINISTRADO desde 2026-10-09).
 * Se pueden tener dos firmas independientes por intervención.
 * Cada nueva firma reemplaza la previa de ese mismo rol.
 */
export async function guardarFirma(intervencionLocalId: string, rol: 'INSPECTOR' | 'ADMINISTRADO', blob: Blob): Promise<void> {
  await db.transaction('rw', db.firmas, async () => {
    const previas = await db.firmas.where('intervencionLocalId').equals(intervencionLocalId).toArray();
    await db.firmas.bulkDelete(previas.filter((f) => f.rol === rol).map((f) => f.id!));
    const registro: FirmaLocal = {
      intervencionLocalId,
      rol,
      blob,
      capturadaEn: new Date().toISOString(),
      sincronizada: false,
    };
    await db.firmas.add(registro);
  });
}

export async function obtenerFirma(intervencionLocalId: string, rol: 'INSPECTOR' | 'ADMINISTRADO'): Promise<FirmaLocal | undefined> {
  const todas = await db.firmas.where('intervencionLocalId').equals(intervencionLocalId).toArray();
  return todas.find((f) => f.rol === rol);
}

export async function eliminarFirma(intervencionLocalId: string, rol: 'INSPECTOR' | 'ADMINISTRADO'): Promise<void> {
  const todas = await db.firmas.where('intervencionLocalId').equals(intervencionLocalId).toArray();
  const aEliminar = todas.filter((f) => f.rol === rol && f.id !== undefined).map((f) => f.id!);
  if (aEliminar.length > 0) {
    await db.firmas.bulkDelete(aEliminar);
  }
}

// Wrappers para mantener compatibilidad con código existente
export async function guardarFirmaInspector(intervencionLocalId: string, blob: Blob): Promise<void> {
  return guardarFirma(intervencionLocalId, 'INSPECTOR', blob);
}

export async function obtenerFirmaInspector(intervencionLocalId: string): Promise<FirmaLocal | undefined> {
  return obtenerFirma(intervencionLocalId, 'INSPECTOR');
}

/** HU-24: firmas todavía no subidas al servidor, para el motor de sincronización. */
export async function listarFirmasPendientes(intervencionLocalId: string): Promise<FirmaLocal[]> {
  return db.firmas
    .where('intervencionLocalId')
    .equals(intervencionLocalId)
    .filter((f) => !f.sincronizada)
    .toArray();
}

export async function marcarFirmaSincronizada(id?: number): Promise<void> {
  if (id === undefined) return;
  await db.firmas.update(id, { sincronizada: true });
}
