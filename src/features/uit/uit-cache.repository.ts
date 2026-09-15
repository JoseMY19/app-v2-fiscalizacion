import { db, type ParametroUitCache } from '../../lib/db';
import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';

interface ParametroUitApiResponse {
  id: string;
  anio: number;
  valorSoles: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

/**
 * HU-13: mismo patrón que el catálogo CUIS — sincroniza TODO (son 2-3
 * filas) y reemplaza uitCache solo si la descarga fue 100% exitosa, para
 * nunca dejar el cache local a medias ni borrarlo por un fetch fallido.
 */
export async function sincronizarParametrosUit(): Promise<number> {
  const respuesta = await fetchAutenticado(`${API_BASE_URL}/uit/parametros`);
  if (!respuesta.ok) {
    throw new Error(`No se pudo sincronizar la UIT (HTTP ${respuesta.status})`);
  }
  const parametros: ParametroUitApiResponse[] = await respuesta.json();
  const filas: ParametroUitCache[] = parametros.map((p) => ({ ...p }));

  await db.transaction('rw', db.uitCache, async () => {
    await db.uitCache.clear();
    await db.uitCache.bulkAdd(filas);
  });

  return filas.length;
}

export async function uitCacheEstaVacio(): Promise<boolean> {
  return (await db.uitCache.count()) === 0;
}

/** HU-13: valor de UIT vigente a una fecha, 100% local — nunca golpea la red durante la intervención. */
export async function obtenerUitVigenteLocal(fecha: Date): Promise<ParametroUitCache | undefined> {
  const todos = await db.uitCache.toArray();
  return todos.find((p) => {
    const desde = new Date(p.vigenteDesde);
    const hasta = p.vigenteHasta ? new Date(p.vigenteHasta) : null;
    return desde <= fecha && (!hasta || hasta >= fecha);
  });
}
