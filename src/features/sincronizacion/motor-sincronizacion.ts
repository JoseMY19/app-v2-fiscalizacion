import { EstadoIntervencion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { calcularEsperaMs } from './backoff';
import { listarPendientes, obtenerEntrada } from './sync-cola.repository';
import { sincronizarIntervencion } from './sincronizar-intervencion';
import { emitirCambioSync } from './sync-eventos';

/**
 * HU-24: motor en segundo plano. Nunca bloquea la UI — todo es fetch
 * async sin await en el hilo de render; se dispara solo (setTimeout por
 * ítem, nunca un intervalo que despierte a todos a la vez).
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let escaneando = false;
let iniciado = false;

function cancelarTimer(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

async function intentarUno(intervencionLocalId: string, forzado: boolean): Promise<void> {
  cancelarTimer(intervencionLocalId);

  if (!forzado) {
    // Un CONFLICTO nunca se resuelve solo reintentando — requiere
    // corrección manual humana (fuera de alcance esta ronda). El escaneo
    // automático no insiste; "Sincronizar ahora" sí puede, por si acaso.
    const intervencion = await db.intervenciones.get(intervencionLocalId);
    if (intervencion?.estado === EstadoIntervencion.CONFLICTO) return;
  }

  const resultado = await sincronizarIntervencion(intervencionLocalId);

  if (resultado === 'SINCRONIZADA' || resultado === 'CONFLICTO') return;
  if (forzado) return; // "Sincronizar ahora" no programa un reintento automático adicional

  const entrada = await obtenerEntrada(intervencionLocalId);
  const esperaMs = calcularEsperaMs(entrada?.intentoNumero ?? 0);
  if (esperaMs === null) return; // se acabaron los intentos automáticos — espera "Sincronizar ahora"

  timers.set(
    intervencionLocalId,
    setTimeout(() => intentarUno(intervencionLocalId, false), esperaMs),
  );
}

/** Autocura la cola: cualquier PENDIENTE_SYNC sin fila propia la recibe acá, no depende de que cada pantalla avise. */
async function idsPendientes(): Promise<string[]> {
  const [intervencionesPendientes, enCola] = await Promise.all([
    db.intervenciones.where('estado').equals(EstadoIntervencion.PENDIENTE_SYNC).toArray(),
    listarPendientes(),
  ]);
  const ids = new Set(intervencionesPendientes.map((i) => i.localId));
  for (const fila of enCola) ids.add(fila.intervencionLocalId);
  return [...ids];
}

export async function escanearYSincronizar(forzado = false): Promise<void> {
  if (escaneando) return;
  escaneando = true;
  try {
    for (const id of await idsPendientes()) {
      await intentarUno(id, forzado);
    }
  } finally {
    escaneando = false;
    emitirCambioSync();
  }
}

export function iniciarMotorSincronizacion(): void {
  if (iniciado) return;
  iniciado = true;
  escanearYSincronizar();
  window.addEventListener('online', () => escanearYSincronizar());
}

/** Se llama justo después de finalizarIntervencion(), sin esperar al ciclo periódico (HU-24: "no bloquea el uso de la app"). */
export function intentarSincronizarInmediato(intervencionLocalId: string): void {
  void intentarUno(intervencionLocalId, false);
}
