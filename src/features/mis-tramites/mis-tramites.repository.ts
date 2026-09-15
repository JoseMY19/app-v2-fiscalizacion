import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';

/** Fila de "Mis trámites": estado de una intervención ya sincronizada, más allá del celular. */
export interface MiTramiteItem {
  id: string;
  fechaHoraInicio: string;
  tipoActuacion: string;
  numeroExpediente: string | null;
  estadoGeneral: string;
  requiereAccionTuya: boolean;
}

/** Siempre del fiscalizador autenticado — nunca se pasa un id a mano. */
export async function listarMisTramites(): Promise<MiTramiteItem[]> {
  const respuesta = await fetchAutenticado(`${API_BASE_URL}/intervenciones/mis-tramites`);
  if (!respuesta.ok) {
    throw new Error(`No se pudo obtener tus trámites (HTTP ${respuesta.status}).`);
  }
  return respuesta.json();
}
