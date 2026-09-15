import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';
import type { BundleIntervencion } from '../sincronizacion/armar-bundle';

/** V-01: fila de la bandeja "intervenciones observadas" del propio fiscalizador. */
export interface IntervencionObservada {
  id: string;
  fechaHoraInicio: string;
  numeroExpediente: string;
  motivo: string;
  fechaObservacion: string | null;
}

/** V-01: siempre del fiscalizador autenticado — nunca se pasa un id a mano. */
export async function listarObservadas(): Promise<IntervencionObservada[]> {
  const respuesta = await fetchAutenticado(`${API_BASE_URL}/intervenciones/observadas`);
  if (!respuesta.ok) {
    throw new Error(`No se pudo obtener la lista de observadas (HTTP ${respuesta.status}).`);
  }
  return respuesta.json();
}

/** V-02: bundle completo desde el servidor — nunca se confía en lo que quede local. */
export async function obtenerBundleIntervencion(id: string): Promise<BundleIntervencion> {
  const respuesta = await fetchAutenticado(`${API_BASE_URL}/intervenciones/${id}`);
  if (!respuesta.ok) {
    throw new Error(`No se pudo obtener la intervención ${id} (HTTP ${respuesta.status}).`);
  }
  return respuesta.json();
}

/**
 * V-02: endpoint de corrección, distinto al de creación (POST /intervenciones
 * es idempotente por id y no actualiza nada si ya existe). El servidor
 * rechaza si el Expediente asociado no está OBSERVADO.
 */
export async function enviarCorreccion(
  id: string,
  bundle: BundleIntervencion,
  comentarioCorreccion: string,
): Promise<void> {
  const { id: _id, ...datos } = bundle;
  const respuesta = await fetchAutenticado(`${API_BASE_URL}/intervenciones/${id}/correccion`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...datos, comentarioCorreccion }),
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.detalle ?? cuerpo?.message ?? `No se pudo enviar la corrección (HTTP ${respuesta.status}).`);
  }
}
