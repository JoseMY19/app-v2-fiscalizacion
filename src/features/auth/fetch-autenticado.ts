import { API_BASE_URL } from '../../lib/config';
import { actualizarAccessToken, obtenerSesion } from './auth.repository';
import { emitirSesionExpirada } from '../sincronizacion/sync-eventos';

/**
 * HU-28 — reemplazo directo de `fetch()` para toda llamada al backend que
 * requiera sesión. Ante un 401 intenta refrescar el access token una sola
 * vez y reintenta; si el refresh también falla, distingue POR QUÉ (ver el
 * plan, "tres escenarios"):
 *   - sin red al refrescar: se trata como cualquier otro corte de señal,
 *     nunca se avisa "sesión expirada" por algo que puede ser solo el wifi.
 *   - refresh token vencido/revocado (HTTP 401 del propio /auth/refresh):
 *     ahí sí se emite el evento, como aviso no bloqueante — la app sigue
 *     usándose, solo la sincronización queda pausada hasta volver a loguear.
 * En ambos casos se propaga la respuesta 401 ORIGINAL, para que el llamador
 * la trate igual que cualquier otro fallo de red (sin lógica nueva).
 */

type ResultadoRefresh = 'ok' | 'invalido' | 'sin-red';

function conAuthHeader(init: RequestInit, accessToken?: string): RequestInit {
  if (!accessToken) return init;
  return { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${accessToken}` } };
}

async function refrescarToken(refreshToken: string): Promise<ResultadoRefresh> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return 'sin-red';
  }
  if (!respuesta.ok) return 'invalido';
  const data: { accessToken: string } = await respuesta.json();
  actualizarAccessToken(data.accessToken);
  return 'ok';
}

export async function fetchAutenticado(url: string, init: RequestInit = {}): Promise<Response> {
  const sesion = obtenerSesion();
  const primeraRespuesta = await fetch(url, conAuthHeader(init, sesion?.accessToken));

  if (primeraRespuesta.status !== 401 || !sesion) {
    return primeraRespuesta;
  }

  const resultado = await refrescarToken(sesion.refreshToken);
  if (resultado === 'sin-red') {
    return primeraRespuesta;
  }
  if (resultado === 'invalido') {
    emitirSesionExpirada();
    return primeraRespuesta;
  }

  const sesionActualizada = obtenerSesion();
  return fetch(url, conAuthHeader(init, sesionActualizada?.accessToken));
}
