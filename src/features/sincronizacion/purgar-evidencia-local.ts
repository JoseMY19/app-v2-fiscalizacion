import { EstadoIntervencion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';

/**
 * HU-26 — CLAUDE.md: "Purgar el almacenamiento local solo tras
 * confirmación explícita del servidor de que la sincronización fue
 * exitosa". Es la primera función de esta app que borra datos de forma
 * permanente, así que el guard NO es cosmético: se revalida `estado`
 * desde Dexie en vez de confiar en que quien llama ya lo verificó.
 *
 * Todo o nada a nivel de intervención — nunca purga fotos/firmas
 * individuales aunque ya tengan `sincronizada: true`, porque `estado`
 * solo llega a SINCRONIZADO cuando TODAS lo tienen (ver
 * sincronizar-intervencion.ts). Si una sola sigue pendiente, esta función
 * no borra nada.
 *
 * Se borran las filas completas (no solo el blob) — nada en la app hoy
 * lee fotos/firmas después de terminar el wizard; el registro liviano de
 * Intervencion (con estado=SINCRONIZADO) se conserva.
 */
export async function purgarEvidenciaLocal(intervencionLocalId: string): Promise<void> {
  const intervencion = await db.intervenciones.get(intervencionLocalId);
  if (intervencion?.estado !== EstadoIntervencion.SINCRONIZADO) {
    return;
  }

  await db.transaction('rw', db.fotos, db.firmas, async () => {
    await db.fotos.where('intervencionLocalId').equals(intervencionLocalId).delete();
    await db.firmas.where('intervencionLocalId').equals(intervencionLocalId).delete();
  });
}
