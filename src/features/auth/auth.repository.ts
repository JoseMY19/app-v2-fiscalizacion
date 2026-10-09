import { API_BASE_URL } from '../../lib/config';
import { generarUuid } from '../../lib/uuid';

/**
 * HU-28 — reemplaza al gate simplificado "¿Quién eres?" (HU-24) por login
 * real. La sesión (tokens + datos del usuario) se guarda en localStorage,
 * no en Dexie: es una preferencia del dispositivo, no un dato de dominio
 * que necesite versionado/migraciones — mismo criterio que ya se usaba
 * para deviceId.
 */
const CLAVE_SESION = 'pas-campo:sesion';
const CLAVE_DEVICE_ID = 'pas-campo:deviceId';

export interface UsuarioSesion {
  id: string;
  dni: string;
  nombres: string;
  rol: string;
  rolNombre?: string;
  debeCambiarContrasena?: boolean;
  tieneFirmaRegistrada?: boolean;
}

interface Sesion {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioSesion;
}

export function obtenerDeviceId(): string {
  let deviceId = localStorage.getItem(CLAVE_DEVICE_ID);
  if (!deviceId) {
    deviceId = generarUuid();
    localStorage.setItem(CLAVE_DEVICE_ID, deviceId);
  }
  return deviceId;
}

export function obtenerSesion(): Sesion | null {
  const crudo = localStorage.getItem(CLAVE_SESION);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as Sesion;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion): void {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
}

/** Usado por fetch-autenticado.ts tras un refresh exitoso — el refresh token no rota. */
export function actualizarAccessToken(accessToken: string): void {
  const sesion = obtenerSesion();
  if (!sesion) return;
  guardarSesion({ ...sesion, accessToken });
}

export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE_SESION);
}

/**
 * Se conserva el nombre y la firma de la función de HU-24 para no tocar
 * sus dos call sites (crearIntervencionConUbicacion, armarBundle). El gate
 * de App.tsx pregunta "¿hubo login alguna vez en este dispositivo?", nunca
 * "¿el access token de ahora mismo es válido?" — la captura offline no
 * depende de la red, ver la respuesta de sesión offline en el plan de HU-28.
 */
export function obtenerFiscalizadorActivo(): string | null {
  return obtenerSesion()?.usuario.id ?? null;
}

export async function login(dni: string, contrasena: string): Promise<UsuarioSesion> {
  const respuesta = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App': 'campo' },
    body: JSON.stringify({ dni, contrasena }),
  });
  if (!respuesta.ok) {
    let mensaje = 'No se pudo iniciar sesión. Revisa tu conexión.';
    if (respuesta.status === 401) {
      try {
        mensaje = (await mensajeDeError(respuesta)) || 'DNI o contraseña incorrectos.';
      } catch {
        mensaje = 'DNI o contraseña incorrectos.';
      }
    } else {
      mensaje = `El servidor respondió HTTP ${respuesta.status}.`;
    }
    throw new Error(mensaje);
  }
  const data: { accessToken: string; refreshToken: string; usuario: UsuarioSesion } = await respuesta.json();
  guardarSesion({ accessToken: data.accessToken, refreshToken: data.refreshToken, usuario: data.usuario });

  // Descarga la firma registrada en segundo plano sin bloquear (fire and forget)
  const { descargarFirmaPerfil } = await import('../evidencia/firma-perfil.repository');
  void descargarFirmaPerfil(data.usuario.id);

  return data.usuario;
}

/** NestJS responde { message: string | string[] }. */
async function mensajeDeError(respuesta: Response): Promise<string | null> {
  const data = (await respuesta.json()) as { message?: string | string[] };
  return Array.isArray(data.message) ? data.message[0] ?? null : data.message ?? null;
}

export async function cambiarContrasena(contrasenaActual: string, contrasenaNueva: string): Promise<void> {
  const sesion = obtenerSesion();
  if (!sesion) {
    throw new Error('No hay sesión activa.');
  }

  const respuesta = await fetch(`${API_BASE_URL}/auth/cambiar-contrasena`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sesion.accessToken}`,
    },
    body: JSON.stringify({ contrasenaActual, contrasenaNueva }),
  });

  if (!respuesta.ok) {
    let mensaje = 'No se pudo cambiar la contraseña. Intenta de nuevo.';
    if (respuesta.status === 400) {
      try {
        mensaje = (await mensajeDeError(respuesta)) || 'Contraseña actual incorrecta.';
      } catch {
        mensaje = 'Contraseña actual incorrecta.';
      }
    }
    throw new Error(mensaje);
  }

  const data: { accessToken: string; refreshToken: string } = await respuesta.json();
  const sesionActual = obtenerSesion();
  if (sesionActual) {
    guardarSesion({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      usuario: { ...sesionActual.usuario, debeCambiarContrasena: false },
    });
  }
}
