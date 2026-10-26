import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';

export type ResultadoNombrePorDni =
  | { estado: 'ok'; nombreCompleto: string }
  | { estado: 'no-encontrado' }
  /** Sin conexión o el servicio de consulta no respondió. */
  | { estado: 'sin-servicio' };

/**
 * Nombre completo a partir de un DNI de 8 dígitos (RENIEC vía el backend). Solo trae el nombre: ni foto ni dirección.
 * Necesita conexión y NUNCA bloquea el registro: si falla, el fiscalizador lo escribe como siempre.
 */
export async function consultarNombrePorDni(dni: string): Promise<ResultadoNombrePorDni> {
  try {
    const r = await fetchAutenticado(`${API_BASE_URL}/busqueda/dni/${encodeURIComponent(dni)}/nombre`);
    if (r.status === 404) return { estado: 'no-encontrado' };
    if (!r.ok) return { estado: 'sin-servicio' };
    const d = await r.json();
    const nombre = typeof d?.nombreCompleto === 'string' ? d.nombreCompleto.trim() : '';
    return nombre ? { estado: 'ok', nombreCompleto: nombre } : { estado: 'no-encontrado' };
  } catch {
    return { estado: 'sin-servicio' };
  }
}
