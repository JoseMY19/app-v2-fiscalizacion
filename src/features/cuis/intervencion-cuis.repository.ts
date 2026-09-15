import { db, type IntervencionCuisLocal } from '../../lib/db';
import { obtenerCodigoLocalPorId, type CuisCodigoLocal, type EscalaCuisLocal } from './cuis-catalogo.repository';

/** HU-07: agrega un código (con su escala, si aplica) a la intervención. Permite más de uno. */
export async function agregarCuisSeleccionado(
  intervencionLocalId: string,
  cuisCodigoId: string,
  cuisEscalaMontoId?: string,
): Promise<number> {
  const registro: IntervencionCuisLocal = {
    intervencionLocalId,
    cuisCodigoId,
    cuisEscalaMontoId,
    seleccionadoEn: new Date().toISOString(),
  };
  return db.intervencionCuis.add(registro);
}

export async function listarCuisSeleccionados(intervencionLocalId: string): Promise<IntervencionCuisLocal[]> {
  return db.intervencionCuis.where('intervencionLocalId').equals(intervencionLocalId).toArray();
}

export async function quitarCuisSeleccionado(id: number): Promise<void> {
  await db.intervencionCuis.delete(id);
}

export interface SeleccionCuisConDetalle {
  registro: IntervencionCuisLocal;
  codigo: CuisCodigoLocal;
  escala?: EscalaCuisLocal;
}

/**
 * HU-11/HU-13: las actas necesitan mostrar (solo lectura) el código ya
 * elegido en HU-07/08 y su % para calcular el monto — esta función reune
 * eso, reutilizada por CuisSelectorScreen y por las pantallas de actas.
 */
export async function listarCuisSeleccionadosConDetalle(intervencionLocalId: string): Promise<SeleccionCuisConDetalle[]> {
  const registros = await listarCuisSeleccionados(intervencionLocalId);
  const conDetalle = await Promise.all(
    registros.map(async (registro): Promise<SeleccionCuisConDetalle | null> => {
      const codigo = await obtenerCodigoLocalPorId(registro.cuisCodigoId);
      if (!codigo) return null; // el código ya no está en el cache (re-sincronizó); no se puede mostrar detalle
      const escala = codigo.escalas.find((e) => e.id === registro.cuisEscalaMontoId);
      return { registro, codigo, escala };
    }),
  );
  return conDetalle.filter((s): s is SeleccionCuisConDetalle => s !== null);
}
