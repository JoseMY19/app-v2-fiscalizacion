import { db, type FirmaPerfilLocal } from '../../lib/db';
import { fetchAutenticado } from '../auth/fetch-autenticado';
import { API_BASE_URL } from '../../lib/config';

/**
 * Gestión de la firma registrada del fiscalizador. Se almacena localmente
 * y se sincroniza con el servidor — permite reutilización offline.
 */

export async function obtenerFirmaPerfil(usuarioId: string): Promise<FirmaPerfilLocal | undefined> {
  return db.firmaPerfil.get(usuarioId);
}

export async function guardarFirmaPerfilLocal(usuarioId: string, blob: Blob): Promise<void> {
  await db.firmaPerfil.put({
    usuarioId,
    blob,
    actualizadaEn: new Date().toISOString(),
    pendienteSubir: true,
  });
}

/**
 * Descarga la firma registrada del servidor si navigator.onLine y no hay
 * una local pendiente. Si 404, borra la local (no existe en el servidor).
 * Errores de red se ignoran (catch silencioso).
 */
export async function descargarFirmaPerfil(usuarioId: string): Promise<void> {
  try {
    // Si no hay conexión o hay una local sin subir, no intentes descargar
    if (!navigator.onLine) return;

    const local = await obtenerFirmaPerfil(usuarioId);
    if (local?.pendienteSubir) return;

    const respuesta = await fetchAutenticado(`${API_BASE_URL}/auth/me/firma`);

    if (respuesta.status === 404) {
      // No existe firma en el servidor, borra la local si no está pendiente
      if (local && !local.pendienteSubir) {
        await db.firmaPerfil.delete(usuarioId);
      }
      return;
    }

    if (!respuesta.ok) return; // Error de red o del servidor — ignora

    const blob = await respuesta.blob();
    await db.firmaPerfil.put({
      usuarioId,
      blob,
      actualizadaEn: new Date().toISOString(),
      pendienteSubir: false,
    });
  } catch {
    // Error de red — no hace nada
  }
}

/**
 * Sube la firma local si hay una pendiente. Marca como no pendiente si 200.
 * Errores de red se ignoran (catch silencioso).
 */
export async function subirFirmaPerfilPendiente(usuarioId: string): Promise<void> {
  try {
    const local = await obtenerFirmaPerfil(usuarioId);
    if (!local?.pendienteSubir) return;

    const formData = new FormData();
    formData.append('firma', local.blob, 'firma.png');

    const respuesta = await fetchAutenticado(`${API_BASE_URL}/auth/me/firma`, {
      method: 'PUT',
      body: formData,
    });

    if (respuesta.ok) {
      // Marca como sincronizada
      await db.firmaPerfil.put({
        ...local,
        pendienteSubir: false,
      });
    }
  } catch {
    // Error de red — no hace nada
  }
}
