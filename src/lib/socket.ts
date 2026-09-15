import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './config';
import { obtenerSesion } from '../features/auth/auth.repository';

/**
 * Infraestructura lista para el próximo aviso en vivo que necesite
 * empujarse hacia el celular (ej. versionado del catálogo CUIS) — hoy
 * ningún flujo se suscribe a un evento todavía. Puramente aditivo: si la
 * conexión falla o se cae, no debe afectar en nada la captura offline
 * existente (ningún flujo de guardado espera a este socket).
 */
export const socket: Socket = io(API_BASE_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: obtenerSesion()?.accessToken ?? null, app: 'campo' }),
});
