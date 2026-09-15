/**
 * HU-24: backoff de reintentos automáticos, decidido explícitamente en el
 * plan — 5s, 15s, 60s, 60s, 60s, luego requiere "Sincronizar ahora" manual
 * (nunca reintenta para siempre solo, para no drenar batería/datos).
 */
const BACKOFF_MS = [5_000, 15_000, 60_000, 60_000, 60_000];

export const MAX_INTENTOS_AUTOMATICOS = BACKOFF_MS.length;

/** `intentoNumero` = cuántos intentos ya se hicieron (0 antes del primero). null = ya no reintentar solo. */
export function calcularEsperaMs(intentoNumero: number): number | null {
  if (intentoNumero < 0 || intentoNumero >= MAX_INTENTOS_AUTOMATICOS) return null;
  return BACKOFF_MS[intentoNumero];
}
