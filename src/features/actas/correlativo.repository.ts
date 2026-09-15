import { TipoActa } from '@pas-sjl/shared-types';
import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';

/**
 * HU-16: "validación de unicidad contra el backend cuando hay conexión;
 * si no hay conexión, se guarda local y se marca conflicto al sincronizar".
 * `null` significa "no se pudo verificar" (sin red o el backend falló) —
 * eso nunca bloquea el guardado, solo `false` (confirmado duplicado) lo hace.
 */
export async function verificarCorrelativoDisponible(
  tipo: TipoActa,
  numero: string,
  excluirIntervencionId?: string,
): Promise<boolean | null> {
  try {
    let url = `${API_BASE_URL}/actas/correlativo-disponible?tipo=${tipo}&numero=${encodeURIComponent(numero)}`;
    // V-02: al corregir una intervención ya sincronizada, el acta reabierta
    // trae el mismo correlativo que ya tenía — sin esta exclusión el
    // backend la marcaría como "duplicada" contra sí misma.
    if (excluirIntervencionId) url += `&excluirIntervencionId=${encodeURIComponent(excluirIntervencionId)}`;
    const respuesta = await fetchAutenticado(url);
    if (!respuesta.ok) return null;
    const data: { disponible: boolean } = await respuesta.json();
    return data.disponible;
  } catch {
    return null;
  }
}
