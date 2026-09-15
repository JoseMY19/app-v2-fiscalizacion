import { db, type FotoLocal } from '../../lib/db';
import { comprimirImagen } from '../../lib/comprimir-imagen';

/** HU-17: mínimo 1 obligatoria, hasta 10. */
export const FOTOS_MINIMO = 1;
export const FOTOS_MAXIMO = 10;

export async function contarFotos(intervencionLocalId: string): Promise<number> {
  return db.fotos.where('intervencionLocalId').equals(intervencionLocalId).count();
}

export async function listarFotos(intervencionLocalId: string): Promise<FotoLocal[]> {
  return db.fotos.where('intervencionLocalId').equals(intervencionLocalId).toArray();
}

/**
 * Fotos de un tipo de acta específico (ver AdjuntarFotoActa.tsx) — nunca
 * se mezclan con la evidencia genérica del hecho de FotosScreen.tsx.
 */
export async function listarFotosPorActaTipo(intervencionLocalId: string, actaTipo: string): Promise<FotoLocal[]> {
  return db.fotos
    .where('intervencionLocalId')
    .equals(intervencionLocalId)
    .filter((f) => f.actaTipo === actaTipo)
    .toArray();
}

/**
 * Comprime siempre antes de guardar — nunca se persiste el archivo
 * original (HT-03). `actaTipo` opcional marca que esta foto es del acta
 * física firmada (no evidencia genérica) — ver erd-sp1-decisiones.md §2.9.
 */
export async function agregarFoto(intervencionLocalId: string, archivo: File | Blob, actaTipo?: string): Promise<void> {
  const actuales = await contarFotos(intervencionLocalId);
  if (actuales >= FOTOS_MAXIMO) {
    throw new Error(`No se pueden agregar más de ${FOTOS_MAXIMO} fotos.`);
  }

  const blobComprimido = await comprimirImagen(archivo);
  const registro: FotoLocal = {
    intervencionLocalId,
    actaTipo,
    blob: blobComprimido,
    capturadaEn: new Date().toISOString(),
    sincronizada: false,
  };
  await db.fotos.add(registro);
}

export async function eliminarFoto(id?: number): Promise<void> {
  if (id === undefined) return;
  await db.fotos.delete(id);
}

/** HU-24: fotos todavía no subidas al servidor, para el motor de sincronización. */
export async function listarFotosPendientes(intervencionLocalId: string): Promise<FotoLocal[]> {
  return db.fotos
    .where('intervencionLocalId')
    .equals(intervencionLocalId)
    .filter((f) => !f.sincronizada)
    .toArray();
}

export async function marcarFotoSincronizada(id?: number): Promise<void> {
  if (id === undefined) return;
  await db.fotos.update(id, { sincronizada: true });
}
