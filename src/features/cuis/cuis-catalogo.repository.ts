import { db, type CuisCodigoCache } from '../../lib/db';
import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';

/** HU-08: una fila de CUIS_ESCALA_MONTO, tal como la expone el backend. */
export interface EscalaCuisLocal {
  id: string;
  escala: 'L' | 'G' | 'MG';
  condicion: string | null;
  porcentaje: number;
  medidaProvisional: string | null;
}

export interface CuisCodigoLocal {
  id: string;
  codigo: string;
  descripcion: string | null;
  requiereDesambiguacion: boolean;
  escalas: EscalaCuisLocal[];
  // HU-14: booleano calculado en el backend (categoría 8 · Urbanismo).
  sugiereValorizacionObra: boolean;
}

interface CuisCodigoApiResponse {
  id: string;
  codigo: string;
  descripcion: string | null;
  requiereDesambiguacion: boolean;
  escalas: EscalaCuisLocal[];
  sugiereValorizacionObra: boolean;
}

function aFilaCache(c: CuisCodigoApiResponse): CuisCodigoCache {
  return {
    id: c.id,
    codigo: c.codigo,
    descripcion: c.descripcion,
    requiereDesambiguacion: c.requiereDesambiguacion,
    escalasJson: JSON.stringify(c.escalas),
    sugiereValorizacionObra: c.sugiereValorizacionObra,
  };
}

function aCodigoLocal(fila: CuisCodigoCache): CuisCodigoLocal {
  return {
    id: fila.id,
    codigo: fila.codigo,
    descripcion: fila.descripcion,
    requiereDesambiguacion: fila.requiereDesambiguacion,
    escalas: JSON.parse(fila.escalasJson),
    sugiereValorizacionObra: fila.sugiereValorizacionObra ?? false,
  };
}

/**
 * HU-07/HU-09: descarga el catálogo completo (GET /cuis/codigos/catalogo,
 * sin límite de resultados) y reemplaza cuisCache. Solo se toca la tabla
 * local si la descarga fue 100% exitosa — un fetch a medias, o sin
 * conexión, nunca debe dejar el catálogo local incompleto ni borrarlo.
 */
export async function sincronizarCatalogoCuis(): Promise<number> {
  const catalogo = await descargarCatalogo();
  await guardarCatalogo(catalogo);
  return catalogo.length;
}

async function descargarCatalogo(): Promise<CuisCodigoApiResponse[]> {
  const respuesta = await fetchAutenticado(`${API_BASE_URL}/cuis/codigos/catalogo`);
  if (!respuesta.ok) {
    throw new Error(`No se pudo sincronizar el catálogo CUIS (HTTP ${respuesta.status})`);
  }
  return respuesta.json();
}

async function guardarCatalogo(catalogo: CuisCodigoApiResponse[]): Promise<void> {
  const filas = catalogo.map(aFilaCache);
  await db.transaction('rw', db.cuisCache, async () => {
    await db.cuisCache.clear();
    await db.cuisCache.bulkAdd(filas);
  });
}

/** Una vez por sesión: el catálogo del servidor ya se verificó contra lo local. */
let catalogoVerificado = false;

/**
 * Antes de enviar una intervención: si el catálogo del servidor cambió (p.
 * ej. se recargaron las escalas de multa con IDs nuevos), la escala elegida
 * en campo puede apuntar a un ID que ya no existe. Se reasocia SOLO cuando
 * hay una equivalencia exacta — mismo código, misma escala (L/G/MG) y misma
 * condición — usando el catálogo local viejo como referencia. Si no hay
 * equivalencia exacta no se toca nada (el servidor lo rechazará y el
 * fiscalizador volverá a elegir). Sin conexión: no hace nada.
 */
export async function reconciliarEscalasConServidor(): Promise<void> {
  if (catalogoVerificado) return;
  let nuevo: CuisCodigoApiResponse[];
  try {
    nuevo = await descargarCatalogo();
  } catch {
    return;
  }
  const nuevoPorId = new Map(nuevo.map((c) => [c.id, c]));
  // Todas las selecciones locales a la vez: después se reemplaza el catálogo viejo (la referencia).
  const registros = await db.intervencionCuis.toArray();
  for (const reg of registros) {
    const codigo = nuevoPorId.get(reg.cuisCodigoId);
    if (!codigo || !reg.cuisEscalaMontoId || codigo.escalas.some((e) => e.id === reg.cuisEscalaMontoId)) continue;
    const viejo = await obtenerCodigoLocalPorId(reg.cuisCodigoId);
    const escalaVieja = viejo?.escalas.find((e) => e.id === reg.cuisEscalaMontoId);
    if (!escalaVieja) continue;
    const equivalentes = codigo.escalas.filter((e) => e.escala === escalaVieja.escala && (e.condicion ?? null) === (escalaVieja.condicion ?? null));
    if (equivalentes.length === 1 && reg.id != null) {
      await db.intervencionCuis.update(reg.id, { cuisEscalaMontoId: equivalentes[0].id });
    }
  }
  await guardarCatalogo(nuevo);
  catalogoVerificado = true;
}

/** HU-07: si nunca sincronizó, la búsqueda local no tiene nada que ofrecer. */
export async function catalogoLocalEstaVacio(): Promise<boolean> {
  return (await db.cuisCache.count()) === 0;
}

/** HU-08: resuelve un código ya elegido contra el cache, para mostrar su detalle. */
export async function obtenerCodigoLocalPorId(id: string): Promise<CuisCodigoLocal | undefined> {
  const fila = await db.cuisCache.get(id);
  return fila ? aCodigoLocal(fila) : undefined;
}

/**
 * HU-07: búsqueda 100% local por código o por texto de la descripción.
 * Nunca llama a la red — eso es justamente lo que este cache evita durante
 * la intervención.
 */
export async function buscarCuisLocal(query: string): Promise<CuisCodigoLocal[]> {
  const texto = query.trim().toLowerCase();
  if (texto.length < 2) return [];

  const todos = await db.cuisCache.toArray();
  return todos
    .filter((c) => c.codigo.toLowerCase().includes(texto) || (c.descripcion ?? '').toLowerCase().includes(texto))
    .slice(0, 30)
    .map(aCodigoLocal);
}
