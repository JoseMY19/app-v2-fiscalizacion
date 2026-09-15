import { API_BASE_URL } from '../../lib/config';

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
}

interface Sesion {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioSesion;
}

export function obtenerDeviceId(): string {
  let deviceId = localStorage.getItem(CLAVE_DEVICE_ID);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, contrasena }),
  });
  if (!respuesta.ok) {
    throw new Error(
      respuesta.status === 401 ? 'DNI o contraseña incorrectos.' : `El servidor respondió HTTP ${respuesta.status}.`,
    );
  }
  const data: { accessToken: string; refreshToken: string; usuario: UsuarioSesion } = await respuesta.json();
  guardarSesion({ accessToken: data.accessToken, refreshToken: data.refreshToken, usuario: data.usuario });
  return data.usuario;
}
