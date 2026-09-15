import { db, type FirmaLocal } from '../../lib/db';

/**
 * HU-18: solo se captura la firma del inspector en su propio dispositivo.
 * La del administrado NO se digitaliza aquí (ver nota en lib/db.ts).
 * Reemplaza cualquier firma previa del inspector — es 1 sola por
 * intervención en la práctica, aunque la tabla no lo fuerce por schema.
 */
export async function guardarFirmaInspector(intervencionLocalId: string, blob: Blob): Promise<void> {
  await db.transaction('rw', db.firmas, async () => {
    const previas = await db.firmas.where('intervencionLocalId').equals(intervencionLocalId).toArray();
    await db.firmas.bulkDelete(previas.filter((f) => f.rol === 'INSPECTOR').map((f) => f.id!));
    const registro: FirmaLocal = {
      intervencionLocalId,
      rol: 'INSPECTOR',
      blob,
      capturadaEn: new Date().toISOString(),
      sincronizada: false,
    };
    await db.firmas.add(registro);
  });
}

export async function obtenerFirmaInspector(intervencionLocalId: string): Promise<FirmaLocal | undefined> {
  const todas = await db.firmas.where('intervencionLocalId').equals(intervencionLocalId).toArray();
  return todas.find((f) => f.rol === 'INSPECTOR');
}

/** HU-24: firmas del inspector todavía no subidas al servidor, para el motor de sincronización. */
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
