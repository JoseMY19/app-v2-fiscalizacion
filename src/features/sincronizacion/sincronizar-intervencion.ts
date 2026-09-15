import { EstadoIntervencion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { API_BASE_URL } from '../../lib/config';
import { fetchAutenticado } from '../auth/fetch-autenticado';
import { armarBundle } from './armar-bundle';
import { listarFotosPendientes, marcarFotoSincronizada } from '../evidencia/fotos.repository';
import { listarFirmasPendientes, marcarFirmaSincronizada } from '../evidencia/firmas.repository';
import { asegurarEnCola, limpiarCola, registrarIntento } from './sync-cola.repository';
import { emitirCambioSync } from './sync-eventos';
import { purgarEvidenciaLocal } from './purgar-evidencia-local';

export type ResultadoSincronizacion = 'SINCRONIZADA' | 'CONFLICTO' | 'ERROR_TRANSITORIO';

type ResultadoBundle = { ok: true } | { ok: false; conflicto: boolean; mensaje: string };

async function subirBundle(bundle: unknown): Promise<ResultadoBundle> {
  try {
    const respuesta = await fetchAutenticado(`${API_BASE_URL}/intervenciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
    });
    if (respuesta.ok) return { ok: true };
    if (respuesta.status === 409) {
      const cuerpo = await respuesta.json().catch(() => null);
      return { ok: false, conflicto: true, mensaje: cuerpo?.detalle ?? 'Correlativo duplicado.' };
    }
    return { ok: false, conflicto: false, mensaje: `El servidor respondió HTTP ${respuesta.status}.` };
  } catch (e) {
    // Sin conexión, timeout, DNS, etc. — siempre transitorio, nunca conflicto.
    return { ok: false, conflicto: false, mensaje: e instanceof Error ? e.message : 'Error de red.' };
  }
}

/**
 * Fase 2: evidencia independiente del bundle (ver el caso borde de "se
 * corta a la mitad" en el plan). Cada foto/firma sube y marca por su
 * cuenta; si una falla, las demás igual se intentan.
 */
async function subirEvidenciaPendiente(intervencionLocalId: string): Promise<boolean> {
  let todoSubido = true;

  for (const foto of await listarFotosPendientes(intervencionLocalId)) {
    try {
      const formData = new FormData();
      formData.append('foto', foto.blob, `foto-${foto.id}.jpg`);
      if (foto.actaTipo) formData.append('actaTipo', foto.actaTipo);
      const respuesta = await fetchAutenticado(`${API_BASE_URL}/intervenciones/${intervencionLocalId}/fotos`, {
        method: 'POST',
        body: formData,
      });
      if (respuesta.ok) await marcarFotoSincronizada(foto.id);
      else todoSubido = false;
    } catch {
      todoSubido = false;
    }
  }

  for (const firma of await listarFirmasPendientes(intervencionLocalId)) {
    try {
      const formData = new FormData();
      formData.append('firma', firma.blob, `firma-${firma.id}.png`);
      formData.append('rol', firma.rol);
      const respuesta = await fetchAutenticado(`${API_BASE_URL}/intervenciones/${intervencionLocalId}/firmas`, {
        method: 'POST',
        body: formData,
      });
      if (respuesta.ok) await marcarFirmaSincronizada(firma.id);
      else todoSubido = false;
    } catch {
      todoSubido = false;
    }
  }

  return todoSubido;
}

/**
 * Orquesta la sincronización de UNA intervención: bundle atómico primero,
 * evidencia después. Idempotente — reintentar tras un corte a la mitad
 * nunca duplica el bundle (el servidor responde yaExistia=true) y solo
 * reintenta la evidencia que siga marcada como no sincronizada.
 */
export async function sincronizarIntervencion(intervencionLocalId: string): Promise<ResultadoSincronizacion> {
  await asegurarEnCola(intervencionLocalId);

  let bundle;
  try {
    bundle = await armarBundle(intervencionLocalId);
  } catch (e) {
    await registrarIntento(intervencionLocalId, {
      exito: false,
      detalleError: e instanceof Error ? e.message : 'No se pudo armar el paquete de sincronización.',
    });
    emitirCambioSync();
    return 'ERROR_TRANSITORIO';
  }

  const resultadoBundle = await subirBundle(bundle);
  if (!resultadoBundle.ok) {
    await registrarIntento(intervencionLocalId, { exito: false, detalleError: resultadoBundle.mensaje });
    if (resultadoBundle.conflicto) {
      // Caso borde de HU-24: dos correlativos iguales casi al mismo tiempo.
      // No tiene sentido reintentar solo — requiere corrección manual humana.
      await db.intervenciones.update(intervencionLocalId, { estado: EstadoIntervencion.CONFLICTO });
      emitirCambioSync();
      return 'CONFLICTO';
    }
    emitirCambioSync();
    return 'ERROR_TRANSITORIO';
  }

  const evidenciaCompleta = await subirEvidenciaPendiente(intervencionLocalId);
  if (!evidenciaCompleta) {
    await registrarIntento(intervencionLocalId, {
      exito: false,
      detalleError: 'El registro se sincronizó, pero falta subir fotos y/o firma.',
    });
    emitirCambioSync();
    return 'ERROR_TRANSITORIO';
  }

  await db.intervenciones.update(intervencionLocalId, { estado: EstadoIntervencion.SINCRONIZADO });
  await limpiarCola(intervencionLocalId);
  // HU-26: la purga es el ÚLTIMO paso, después de confirmar éxito total
  // (bundle + cada foto/firma individualmente) — nunca antes.
  await purgarEvidenciaLocal(intervencionLocalId);
  emitirCambioSync();
  return 'SINCRONIZADA';
}
