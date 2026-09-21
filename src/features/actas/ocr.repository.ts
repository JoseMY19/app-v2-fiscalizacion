import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';
import type { DatosOcrActa } from '../../lib/ocr-offline';

/**
 * Modo "con internet": manda la foto al backend, que la procesa con
 * Google Document AI. Si el backend responde 503 (sin credenciales
 * configuradas todavía) o cualquier otro error, se propaga como
 * excepción — el llamador decide si cae al modo offline o solo avisa.
 */
export async function escanearActaConInternet(tipoActa: string, imagen: File): Promise<DatosOcrActa> {
  const formData = new FormData();
  formData.append('foto', imagen);

  const respuesta = await fetchAutenticado(`${API_BASE_URL}/ocr/${tipoActa}`, {
    method: 'POST',
    body: formData,
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.message ?? 'No se pudo leer la foto en la nube.');
  }

  return respuesta.json();
}
