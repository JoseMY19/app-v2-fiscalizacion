import { useEffect, useState } from 'react';
import { TipoActuacion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { listarCuisSeleccionadosConDetalle } from '../cuis/intervencion-cuis.repository';
import { listarActasMedidaProvisional } from '../actas/acta-medida-provisional.repository';
import { listarActasValorizacionObra } from '../actas/acta-valorizacion-obra.repository';
import { listarActasAdicionales } from '../actas/acta-adicional.repository';
import { listarFotos } from '../evidencia/fotos.repository';
import { obtenerFirmaInspector } from '../evidencia/firmas.repository';
import { calcularFaltantes, type SeccionWizard } from './calcularFaltantes';

/**
 * HU-19 — Revisar resumen antes de cerrar. Todas las actas, datos del
 * administrado, fotos y firmas capturadas; resalta lo obligatorio
 * faltante según el camino (HU-10); permite volver a cualquier sección
 * (cada pantalla precarga su valor, no se pierde nada).
 */

interface Props {
  localId: string;
  onEditar: (seccion: SeccionWizard) => void;
  onVolver: () => void;
  onFinalizar: () => void | Promise<void>;
  /** V-02: reabierta desde "Intervenciones observadas" para corregir. */
  modoEdicion?: boolean;
  /** Solo se usa (y es obligatorio en la práctica) cuando modoEdicion=true. */
  onEnviarCorreccion?: (comentario: string) => Promise<void>;
}

interface DatosResumen {
  tipoActuacion: TipoActuacion | undefined;
  administradoTexto: string;
  ubicacionTexto: string;
  cuisTextos: string[];
  tieneActaExhortacion: boolean;
  tieneActaFiscalizacion: boolean;
  tieneNotificacionCargo: boolean;
  entregaNcTexto: string | null;
  totalAdicionales: number;
  totalFotos: number;
  tieneFirmaInspector: boolean;
}

import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import { actionsFooter, alerta, appContainer, badge, btn, card, customList, formGroup, formHint, formInput, formLabel, formLabelRequired } from '../../lib/ui';

export default function ResumenScreen({
  localId,
  onEditar,
  onVolver,
  onFinalizar,
  modoEdicion = false,
  onEnviarCorreccion,
}: Props) {
  const [datos, setDatos] = useState<DatosResumen | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [comentarioCorreccion, setComentarioCorreccion] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      const [intervencion, administrado, cuis, actaExhortacion, actaFiscalizacion, notificacionCargo, medidas, valorizaciones, adicionales, fotos, firma] =
        await Promise.all([
          db.intervenciones.get(localId),
          db.administrados.get(localId),
          listarCuisSeleccionadosConDetalle(localId),
          db.actasExhortacion.get(localId),
          db.actasFiscalizacion.get(localId),
          db.notificacionesCargo.get(localId),
          listarActasMedidaProvisional(localId),
          listarActasValorizacionObra(localId),
          listarActasAdicionales(localId),
          listarFotos(localId),
          obtenerFirmaInspector(localId),
        ]);

      let entregaNcTexto: string | null = null;
      if (notificacionCargo?.modoNotificacion) {
        const fecha = notificacionCargo.fechaNotificacion?.slice(0, 16).replace('T', ' ');
        if (notificacionCargo.modoNotificacion === 'DOMICILIARIA_PENDIENTE') {
          entregaNcTexto = 'No entregada en el acto — pendiente de notificación domiciliaria.';
        } else if (notificacionCargo.modoNotificacion === 'PERSONAL_NEGATIVA') {
          entregaNcTexto = `Entregada en el acto (${fecha}) con negativa a firmar, con testigos.`;
        } else {
          entregaNcTexto = `Entregada y firmada en el acto (${fecha}).`;
        }
      }

      setDatos({
        tipoActuacion: intervencion?.tipoActuacion,
        administradoTexto: administrado?.identificado
          ? `${administrado.nombresRazonSocial ?? '(sin nombre)'} — ${administrado.numeroDocumento ?? '(sin documento)'}`
          : 'No identificado (pendiente de saneamiento)',
        ubicacionTexto: intervencion?.latitud
          ? `${intervencion.latitud.toFixed(5)}, ${intervencion.longitud?.toFixed(5)}`
          : intervencion?.direccionAproximada ?? '(sin ubicación)',
        cuisTextos: cuis.map((s) => `${s.codigo.codigo} — ${s.codigo.descripcion ?? ''}`),
        tieneActaExhortacion: !!actaExhortacion,
        tieneActaFiscalizacion: !!actaFiscalizacion,
        tieneNotificacionCargo: !!notificacionCargo,
        entregaNcTexto,
        totalAdicionales: medidas.length + valorizaciones.length + adicionales.length,
        totalFotos: fotos.length,
        tieneFirmaInspector: !!firma,
      });
    }
    cargar();
  }, [localId]);

  if (!datos) {
    return (
      <div className={cn(appContainer, 'text-center! py-[3rem]! px-[1rem]!')}>
        <p className="text-text-muted">Cargando resumen de la intervención…</p>
      </div>
    );
  }

  const faltantes = calcularFaltantes({
    tipoActuacion: datos.tipoActuacion,
    totalCuisSeleccionados: datos.cuisTextos.length,
    tieneActaExhortacion: datos.tieneActaExhortacion,
    tieneActaFiscalizacion: datos.tieneActaFiscalizacion,
    tieneNotificacionCargo: datos.tieneNotificacionCargo,
    tieneRespuestaEntregaNc: datos.entregaNcTexto !== null,
    totalFotos: datos.totalFotos,
    tieneFirmaInspector: datos.tieneFirmaInspector,
    omitirEvidencia: modoEdicion,
  });

  function tieneFaltante(seccion: SeccionWizard): string | undefined {
    return faltantes.find((f) => f.seccion === seccion)?.mensaje;
  }

  const comentarioListo = comentarioCorreccion.trim().length > 0;
  const puedeEnviar = modoEdicion
    ? faltantes.length === 0 && comentarioListo && !finalizando
    : faltantes.length === 0 && !finalizando;

  async function handleFinalizar() {
    if (!puedeEnviar) return;
    setFinalizando(true);
    setError(null);
    try {
      if (modoEdicion && onEnviarCorreccion) {
        await onEnviarCorreccion(comentarioCorreccion.trim());
      } else {
        await onFinalizar();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la corrección. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={8}
        totalPasos={8}
        titulo="Resumen de Intervención"
        subtitulo="Verificación de requisitos antes del cierre y pase a sincronización"
        onVolver={onVolver}
        deshabilitarVolver={finalizando}
      />

      {faltantes.length > 0 ? (
        <div className={cn(alerta('warning'), 'mb-[1.25rem]!')} role="alert">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <div className="font-bold">Campos obligatorios pendientes ({faltantes.length})</div>
            <p className="text-[0.8125rem] mb-0 mt-[0.25rem]">
              Revisa y completa las secciones marcadas con advertencia antes de finalizar el acta.
            </p>
          </div>
        </div>
      ) : (
        <div className={cn(alerta('success'), 'mb-[1.25rem]!')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <div className="font-bold">Todos los requisitos completos</div>
            <p className="text-[0.8125rem] mb-0 mt-[0.25rem]">
              La intervención cuenta con todos los datos legales requeridos para su cierre y transmisión.
            </p>
          </div>
        </div>
      )}

      {/* 1. Ubicación */}
      <div className={card()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[0.9375rem] m-0">1. Ubicación Georreferenciada</h2>
          <span className={badge('success')}>Registrada</span>
        </div>
        <p className="text-[0.875rem] mt-[0.5rem] mb-0 text-text-body">
          {datos.ubicacionTexto}
        </p>
      </div>

      {/* 2. Administrado */}
      <div className={card()}>
        <div className="flex items-center justify-between mb-[0.5rem]">
          <h2 className="text-[0.9375rem] m-0">2. Administrado</h2>
          <button
            type="button"
            className={btn('outline', { tamano: 'sm' })}
            onClick={() => onEditar('administrado')}
          >
            Editar
          </button>
        </div>
        <p className="text-[0.875rem] mb-0 text-text-body">
          {datos.administradoTexto}
        </p>
      </div>

      {/* 3. Códigos CUIS */}
      <div className={card(tieneFaltante('cuis') ? 'warning' : 'default')}>
        <div className="flex items-center justify-between mb-[0.5rem]">
          <div className="flex items-center gap-[0.5rem]">
            <h2 className="text-[0.9375rem] m-0">3. Códigos de Infracción (CUIS)</h2>
            {tieneFaltante('cuis') && <span className={badge('danger')}>Requerido</span>}
          </div>
          <button
            type="button"
            className={btn('outline', { tamano: 'sm' })}
            onClick={() => onEditar('cuis')}
          >
            Editar
          </button>
        </div>
        {datos.cuisTextos.length === 0 ? (
          <p className="text-[0.875rem] text-text-muted mb-0">
            Ningún código seleccionado.
          </p>
        ) : (
          <ul className={customList}>
            {datos.cuisTextos.map((t) => (
              <li key={t} className="text-[0.8125rem] text-text-body">
                • {t}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 4. Actas según el camino */}
      {datos.tipoActuacion === TipoActuacion.EXHORTACION && (
        <div className={card(tieneFaltante('acta-exhortacion') ? 'warning' : 'default')}>
          <div className="flex items-center justify-between mb-[0.5rem]">
            <div className="flex items-center gap-[0.5rem]">
              <h2 className="text-[0.9375rem] m-0">4. Acta de Exhortación</h2>
              {tieneFaltante('acta-exhortacion') ? (
                <span className={badge('danger')}>Falta</span>
              ) : (
                <span className={badge('success')}>Registrada</span>
              )}
            </div>
            <button
              type="button"
              className={btn('outline', { tamano: 'sm' })}
              onClick={() => onEditar('acta-exhortacion')}
            >
              Editar
            </button>
          </div>
          <p className="text-[0.875rem] mb-0 text-text-body">
            {datos.tieneActaExhortacion ? 'Registrada correctamente.' : 'Falta registrar el acta.'}
          </p>
        </div>
      )}

      {(datos.tipoActuacion === TipoActuacion.CONSTATACION || datos.tipoActuacion === TipoActuacion.INICIA_PAS) && (
        <div className={card(tieneFaltante('acta-fiscalizacion') ? 'warning' : 'default')}>
          <div className="flex items-center justify-between mb-[0.5rem]">
            <div className="flex items-center gap-[0.5rem]">
              <h2 className="text-[0.9375rem] m-0">4. Acta de Fiscalización</h2>
              {tieneFaltante('acta-fiscalizacion') ? (
                <span className={badge('danger')}>Falta</span>
              ) : (
                <span className={badge('success')}>Registrada</span>
              )}
            </div>
            <button
              type="button"
              className={btn('outline', { tamano: 'sm' })}
              onClick={() => onEditar('acta-fiscalizacion')}
            >
              Editar
            </button>
          </div>
          <p className="text-[0.875rem] mb-0 text-text-body">
            {datos.tieneActaFiscalizacion ? 'Registrada correctamente.' : 'Falta registrar el acta.'}
          </p>
        </div>
      )}

      {datos.tipoActuacion === TipoActuacion.INICIA_PAS && (
        <>
          <div className={card(tieneFaltante('notificacion-cargo') ? 'warning' : 'default')}>
            <div className="flex items-center justify-between mb-[0.5rem]">
              <div className="flex items-center gap-[0.5rem]">
                <h2 className="text-[0.9375rem] m-0">5. Notificación de Cargo</h2>
                {tieneFaltante('notificacion-cargo') ? (
                  <span className={badge('danger')}>Falta</span>
                ) : (
                  <span className={badge('success')}>Registrada</span>
                )}
              </div>
              <button
                type="button"
                className={btn('outline', { tamano: 'sm' })}
                onClick={() => onEditar('notificacion-cargo')}
              >
                Editar
              </button>
            </div>
            <p className="text-[0.875rem] mb-0 text-text-body">
              {datos.tieneNotificacionCargo ? 'Registrada correctamente.' : 'Falta registrar la NC.'}
            </p>
          </div>

          {datos.tieneNotificacionCargo && (
            <div className={card(tieneFaltante('notificacion-entrega') ? 'warning' : 'default')}>
              <div className="flex items-center justify-between mb-[0.5rem]">
                <div className="flex items-center gap-[0.5rem]">
                  <h2 className="text-[0.9375rem] m-0">6. Entrega de Notificación</h2>
                  {tieneFaltante('notificacion-entrega') && <span className={badge('danger')}>Falta</span>}
                </div>
                <button
                  type="button"
                  className={btn('outline', { tamano: 'sm' })}
                  onClick={() => onEditar('notificacion-entrega')}
                >
                  Editar
                </button>
              </div>
              <p className="text-[0.875rem] mb-0 text-text-body">
                {datos.entregaNcTexto ?? 'Todavía no se respondió si se entregó en el acto.'}
              </p>
            </div>
          )}

          <div className={card()}>
            <h2 className="text-[0.9375rem] mt-0 mr-0 mb-[0.5rem] ml-0">7. Actas Adicionales</h2>
            <p className="text-[0.875rem] mb-0 text-text-body">
              {datos.totalAdicionales} registrada(s) (opcionales).
            </p>
          </div>
        </>
      )}

      {/* 5. Fotos */}
      <div className={card(tieneFaltante('fotos') ? 'warning' : 'default')}>
        <div className="flex items-center justify-between mb-[0.5rem]">
          <div className="flex items-center gap-[0.5rem]">
            <h2 className="text-[0.9375rem] m-0">Evidencia Fotográfica</h2>
            <span className={badge(datos.totalFotos > 0 ? 'success' : 'warning')}>
              {datos.totalFotos} foto(s)
            </span>
          </div>
          <button
            type="button"
            className={btn('outline', { tamano: 'sm' })}
            onClick={() => onEditar('fotos')}
          >
            Editar
          </button>
        </div>
        <p className="text-[0.875rem] mb-0 text-text-body">
          {datos.totalFotos > 0 ? `${datos.totalFotos} fotografía(s) adjuntada(s).` : 'Falta adjuntar al menos 1 fotografía.'}
        </p>
      </div>

      {/* 6. Firma */}
      <div className={card(tieneFaltante('firma') ? 'warning' : 'default')}>
        <div className="flex items-center justify-between mb-[0.5rem]">
          <div className="flex items-center gap-[0.5rem]">
            <h2 className="text-[0.9375rem] m-0">Firma del Inspector</h2>
            <span className={badge(datos.tieneFirmaInspector ? 'success' : 'danger')}>
              {datos.tieneFirmaInspector ? 'Conforme' : 'Falta'}
            </span>
          </div>
          <button
            type="button"
            className={btn('outline', { tamano: 'sm' })}
            onClick={() => onEditar('firma')}
          >
            Editar
          </button>
        </div>
        <p className="text-[0.875rem] mb-0 text-text-body">
          {datos.tieneFirmaInspector ? 'Firma digital registrada y validada.' : 'Falta capturar la firma del inspector.'}
        </p>
      </div>

      {modoEdicion && (
        <div className={card()}>
          <div className={cn(formGroup, 'mb-0!')}>
            <label className={cn(formLabel, formLabelRequired)}>¿Qué se corrigió?</label>
            <textarea
              className={formInput}
              rows={3}
              placeholder="Ej. Corregí el número de DNI del administrado, que estaba mal digitado."
              value={comentarioCorreccion}
              onChange={(e) => setComentarioCorreccion(e.target.value)}
              disabled={finalizando}
            />
            <span className={formHint}>Obligatorio — el validador necesita saber qué cambió antes de revisarlo de nuevo.</span>
          </div>
        </div>
      )}

      {error && (
        <div className={cn(alerta('error'), 'mb-[1.25rem]!')} role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className={actionsFooter}>
        <button
          type="button"
          className={btn('primary', { tamano: 'lg', block: true })}
          onClick={handleFinalizar}
          disabled={!puedeEnviar}
        >
          {finalizando ? (
            <span>{modoEdicion ? 'Enviando corrección…' : 'Finalizando intervención…'}</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{modoEdicion ? 'Enviar corrección' : 'Finalizar Intervención'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
