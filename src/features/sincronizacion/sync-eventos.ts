/**
 * Bus de eventos mínimo (sin dependencias nuevas) para que el badge de
 * HU-25 se refresque cuando cambia la cola, sin hacer polling. HU-28
 * reusa el mismo bus para avisar (sin bloquear) que el refresh token
 * venció o fue revocado.
 */
const bus = new EventTarget();
const EVENTO_CAMBIO = 'cambio';
const EVENTO_SESION_EXPIRADA = 'sesion-expirada';

export function emitirCambioSync(): void {
  bus.dispatchEvent(new Event(EVENTO_CAMBIO));
}

export function suscribirseACambiosSync(callback: () => void): () => void {
  bus.addEventListener(EVENTO_CAMBIO, callback);
  return () => bus.removeEventListener(EVENTO_CAMBIO, callback);
}

export function emitirSesionExpirada(): void {
  bus.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
}

export function suscribirseASesionExpirada(callback: () => void): () => void {
  bus.addEventListener(EVENTO_SESION_EXPIRADA, callback);
  return () => bus.removeEventListener(EVENTO_SESION_EXPIRADA, callback);
}
