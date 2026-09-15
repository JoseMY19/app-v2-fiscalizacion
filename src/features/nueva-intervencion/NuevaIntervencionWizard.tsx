import { useEffect, useState } from 'react';
import { TipoActuacion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import NuevaIntervencionScreen from './NuevaIntervencionScreen';
import OrigenIntervencionScreen from './OrigenIntervencionScreen';
import AdministradoScreen from './AdministradoScreen';
import TipoActuacionScreen from './TipoActuacionScreen';
import CuisSelectorScreen from '../cuis/CuisSelectorScreen';
import ActaExhortacionScreen from '../actas/ActaExhortacionScreen';
import ActaFiscalizacionScreen from '../actas/ActaFiscalizacionScreen';
import NotificacionCargoScreen from '../actas/NotificacionCargoScreen';
import NotificacionEntregaScreen from '../actas/NotificacionEntregaScreen';
import TestigosScreen from '../actas/TestigosScreen';
import ActasAdicionalesScreen from '../actas/ActasAdicionalesScreen';
import FotosScreen from '../evidencia/FotosScreen';
import FirmaScreen from '../evidencia/FirmaScreen';
import ResumenScreen from '../resumen/ResumenScreen';
import type { SeccionWizard } from '../resumen/calcularFaltantes';
import { finalizarIntervencion } from './intervenciones.repository';
import { intentarSincronizarInmediato } from '../sincronizacion/motor-sincronizacion';
import { armarBundle } from '../sincronizacion/armar-bundle';
import { enviarCorreccion } from '../correccion/intervenciones-observadas.repository';

/**
 * Encadena HU-01 → HU-03 → HU-04/05 → HU-07/08 → HU-10 → la acta que
 * corresponde al camino (HU-11/12/13/14, con HU-20/21 en camino C) →
 * testigos (siempre, los 3 caminos — cambio de regla 2026-09-14, ver
 * TestigosScreen) → HU-17 (fotos) → HU-18 (firma) → HU-19 (resumen, donde
 * se decide cerrar).
 *
 * Navegación: `historial` es una pila de vistas. `volver()` saca la
 * última (retrocede un paso); el resumen también puede saltar
 * directamente a una sección con `onEditar`. Cada pantalla precarga su
 * propio valor desde Dexie al montar, así que ningún salto pierde datos.
 *
 * V-02 — modo edición: reusa exactamente el mismo flujo (sin pantallas
 * nuevas) para corregir una intervención ya sincronizada y observada.
 * Arranca en 'origen' (nunca 'ubicacion', que usa `.add()` y fallaría
 * sobre un localId que ya existe) y con `localIdInicial` ya asignado.
 * `camino`/`identificado` son estado local del wizard que normalmente solo
 * se llenan caminando por 'camino'/'administrado' — en modo edición hay
 * que sembrarlos leyendo Dexie al montar, si no `handleFinalizarDesdeResumen`
 * y el ruteo de ActaFiscalizacionScreen usarían el valor por defecto
 * equivocado. El paso 'camino' queda inalcanzable: solo intervenciones
 * INICIA_PAS llegan a este modo (son las únicas con Expediente), cambiar
 * el camino a mitad de una corrección dejaría un Expediente huérfano.
 */

type Vista =
  | 'ubicacion'
  | 'origen'
  | 'administrado'
  | 'cuis'
  | 'camino'
  | 'acta-exhortacion'
  | 'acta-fiscalizacion'
  | 'notificacion-cargo'
  | 'notificacion-entrega'
  | 'testigos'
  | 'actas-adicionales'
  | 'fotos'
  | 'firma'
  | 'resumen';

interface Props {
  onFinalizar: (resultado: { localId: string; identificado: boolean; cerrada: boolean; camino: TipoActuacion }) => void;
  onCancelar: () => void;
  modoEdicion?: boolean;
  localIdInicial?: string;
}

export default function NuevaIntervencionWizard({
  onFinalizar,
  onCancelar,
  modoEdicion = false,
  localIdInicial,
}: Props) {
  const [historial, setHistorial] = useState<Vista[]>([modoEdicion ? 'origen' : 'ubicacion']);
  const [localId, setLocalId] = useState<string | null>(modoEdicion ? localIdInicial ?? null : null);
  const [identificado, setIdentificado] = useState(true);
  const [camino, setCamino] = useState<TipoActuacion | null>(null);

  useEffect(() => {
    if (!modoEdicion || !localId) return;
    db.intervenciones.get(localId).then((intervencion) => {
      if (intervencion?.tipoActuacion) setCamino(intervencion.tipoActuacion);
    });
    db.administrados.get(localId).then((administrado) => {
      if (administrado) setIdentificado(administrado.identificado);
    });
  }, [modoEdicion, localId]);

  const vista = historial[historial.length - 1];

  function avanzar(v: Vista) {
    setHistorial((h) => [...h, v]);
  }

  function volver() {
    setHistorial((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }

  function irASeccion(seccion: SeccionWizard) {
    avanzar(seccion);
  }

  async function handleFinalizarDesdeResumen() {
    if (!localId) return;
    const caminoFinal = camino ?? TipoActuacion.EXHORTACION;
    await finalizarIntervencion(localId, caminoFinal);
    // HU-24: intenta sincronizar de inmediato, sin esperar al ciclo
    // periódico — "fire and forget", nunca bloquea el cierre del wizard.
    intentarSincronizarInmediato(localId);
    onFinalizar({ localId, identificado, cerrada: true, camino: caminoFinal });
  }

  /**
   * V-02: nunca pasa por finalizarIntervencion ni por el motor de
   * sincronización (colaSincronizacion) — si lo hiciera, ese motor la
   * recogería y la mandaría por el endpoint de CREACIÓN, que la ignora
   * silenciosamente (yaExistia:true). La corrección es siempre una
   * llamada directa e inmediata, nunca encolada.
   */
  async function handleEnviarCorreccion(comentario: string) {
    if (!localId) return;
    const bundle = await armarBundle(localId);
    await enviarCorreccion(localId, bundle, comentario);
    onFinalizar({ localId, identificado, cerrada: true, camino: camino ?? TipoActuacion.INICIA_PAS });
  }

  if (vista === 'ubicacion') {
    return (
      <NuevaIntervencionScreen
        onGuardado={(id) => {
          setLocalId(id);
          avanzar('origen');
        }}
        onCancelar={onCancelar}
      />
    );
  }

  if (!localId) return null; // no debería ocurrir: toda vista después de 'ubicacion' requiere localId

  if (vista === 'origen') {
    return <OrigenIntervencionScreen localId={localId} onContinuar={() => avanzar('administrado')} onVolver={volver} />;
  }

  if (vista === 'administrado') {
    return (
      <AdministradoScreen
        localId={localId}
        onFinalizar={({ identificado: id }) => {
          setIdentificado(id);
          avanzar('cuis');
        }}
        onVolver={volver}
      />
    );
  }

  if (vista === 'cuis') {
    return (
      <CuisSelectorScreen
        localId={localId}
        onContinuar={() => avanzar(modoEdicion ? 'acta-fiscalizacion' : 'camino')}
        onVolver={volver}
      />
    );
  }

  if (vista === 'camino') {
    return (
      <TipoActuacionScreen
        localId={localId}
        onElegido={(elegido) => {
          setCamino(elegido);
          avanzar(elegido === TipoActuacion.EXHORTACION ? 'acta-exhortacion' : 'acta-fiscalizacion');
        }}
        onVolver={volver}
      />
    );
  }

  if (vista === 'acta-exhortacion') {
    return <ActaExhortacionScreen localId={localId} onGuardada={() => avanzar('testigos')} onVolver={volver} />;
  }

  if (vista === 'acta-fiscalizacion') {
    return (
      <ActaFiscalizacionScreen
        localId={localId}
        onGuardada={() => avanzar(camino === TipoActuacion.CONSTATACION ? 'testigos' : 'notificacion-cargo')}
        onVolver={volver}
      />
    );
  }

  if (vista === 'notificacion-cargo') {
    return (
      <NotificacionCargoScreen localId={localId} onGuardada={() => avanzar('notificacion-entrega')} onVolver={volver} />
    );
  }

  if (vista === 'notificacion-entrega') {
    return (
      <NotificacionEntregaScreen localId={localId} onContinuar={() => avanzar('testigos')} onVolver={volver} />
    );
  }

  if (vista === 'testigos') {
    return (
      <TestigosScreen
        localId={localId}
        onContinuar={() => avanzar(camino === TipoActuacion.INICIA_PAS ? 'actas-adicionales' : 'fotos')}
        onVolver={volver}
      />
    );
  }

  if (vista === 'actas-adicionales') {
    return <ActasAdicionalesScreen localId={localId} onContinuar={() => avanzar('fotos')} onVolver={volver} />;
  }

  if (vista === 'fotos') {
    return <FotosScreen localId={localId} onContinuar={() => avanzar('firma')} onVolver={volver} />;
  }

  if (vista === 'firma') {
    return <FirmaScreen localId={localId} onContinuar={() => avanzar('resumen')} onVolver={volver} />;
  }

  return (
    <ResumenScreen
      localId={localId}
      onEditar={irASeccion}
      onVolver={volver}
      onFinalizar={handleFinalizarDesdeResumen}
      modoEdicion={modoEdicion}
      onEnviarCorreccion={handleEnviarCorreccion}
    />
  );
}
