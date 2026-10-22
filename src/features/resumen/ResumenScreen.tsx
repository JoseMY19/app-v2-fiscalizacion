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

import type { ReactNode } from 'react';
import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import { alerta, appContainer, btnCampo, campoRelleno, campoRellenoEtiqueta, campoRellenoInput, iconoTarjeta, tarjetaSuave } from '../../lib/ui';

type EstadoSeccion = 'ok' | 'falta' | 'opcional';

interface SeccionResumen {
  clave: string;
  titulo: string;
  detalle: ReactNode;
  estado: EstadoSeccion;
  etiqueta?: string;
  icono: ReactNode;
  editar?: SeccionWizard;
}

const svg = (contenido: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {contenido}
  </svg>
);

const ICONOS = {
  ubicacion: svg(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>),
  administrado: svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  cuis: svg(<><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></>),
  acta: svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>),
  notificacion: svg(<><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><polyline points="22 6 12 13 2 6" /></>),
  entrega: svg(<><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></>),
  adicionales: svg(<><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11v6M9 14h6" /></>),
  fotos: svg(<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>),
  firma: svg(<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>),
};

const COLOR_ICONO: Record<EstadoSeccion, string> = {
  ok: 'bg-success-bg text-success',
  falta: 'bg-warning-bg text-warning',
  opcional: 'bg-campo-50 text-campo-700',
};
const chipEstado = 'inline-flex items-center px-2 py-0.5 rounded-pill text-[0.6875rem] font-bold whitespace-nowrap border border-solid';
const COLOR_CHIP: Record<EstadoSeccion, string> = {
  ok: 'bg-success-bg border-success-border text-success',
  falta: 'bg-warning-bg border-warning-border text-warning',
  opcional: 'bg-bg-subtle border-border text-text-muted',
};
const btnEditar =
  'inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-white border border-solid border-campo-200 text-campo-700 text-xs font-semibold cursor-pointer shrink-0 ' +
  'transition-colors duration-150 hover:bg-campo-50 active:scale-95';

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
          entregaNcTexto = 'No entregada en el acto - pendiente de notificación domiciliaria.';
        } else if (notificacionCargo.modoNotificacion === 'PERSONAL_NEGATIVA') {
          // Testigos opcionales (C1): solo se menciona si realmente se registraron.
          const totalTestigos = await db.testigos.where('intervencionLocalId').equals(localId).count();
          entregaNcTexto = `Entregada en el acto (${fecha}) con negativa a firmar, ${totalTestigos > 0 ? 'con testigos' : 'sin testigos'}.`;
        } else {
          entregaNcTexto = `Entregada y firmada en el acto (${fecha}).`;
        }
      }

      setDatos({
        tipoActuacion: intervencion?.tipoActuacion,
        administradoTexto: administrado?.identificado
          ? `${administrado.nombresRazonSocial ?? '(sin nombre)'} - ${administrado.numeroDocumento ?? '(sin documento)'}`
          : 'No identificado (pendiente de saneamiento)',
        ubicacionTexto:
          intervencion?.direccionAproximada ??
          (intervencion?.latitud ? `${intervencion.latitud.toFixed(5)}, ${intervencion.longitud?.toFixed(5)}` : '(sin ubicación)'),
        cuisTextos: cuis.map((s) => `${s.codigo.codigo} - ${s.codigo.descripcion ?? ''}`),
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
      <div className={appContainer}>
        <div className={cn(tarjetaSuave, 'p-6 text-center')}>
          <div className={cn(iconoTarjeta, 'w-12 h-12 rounded-full mx-auto mb-3 bg-campo-50 text-campo-700 animate-pulse')}>{ICONOS.acta}</div>
          <p className="text-sm text-text-muted m-0">Cargando resumen de la intervención…</p>
        </div>
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

  const esPas = datos.tipoActuacion === TipoActuacion.INICIA_PAS;
  const estadoDe = (seccion: SeccionWizard): EstadoSeccion => (tieneFaltante(seccion) ? 'falta' : 'ok');

  const secciones: SeccionResumen[] = [
    { clave: 'ubicacion', titulo: 'Ubicación', detalle: datos.ubicacionTexto, estado: 'ok', icono: ICONOS.ubicacion },
    { clave: 'administrado', titulo: 'Administrado', detalle: datos.administradoTexto, estado: 'ok', icono: ICONOS.administrado, editar: 'administrado' },
    {
      clave: 'cuis',
      titulo: 'Infracciones (CUIS)',
      detalle:
        datos.cuisTextos.length === 0 ? (
          'Ningún código seleccionado.'
        ) : (
          <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
            {datos.cuisTextos.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        ),
      estado: estadoDe('cuis'),
      etiqueta: datos.cuisTextos.length > 0 ? `${datos.cuisTextos.length}` : 'Requerido',
      icono: ICONOS.cuis,
      editar: 'cuis',
    },
  ];

  if (datos.tipoActuacion === TipoActuacion.EXHORTACION) {
    secciones.push({
      clave: 'acta-exhortacion',
      titulo: 'Acta de Exhortación',
      detalle: datos.tieneActaExhortacion ? 'Registrada correctamente.' : 'Falta registrar el acta.',
      estado: estadoDe('acta-exhortacion'),
      icono: ICONOS.acta,
      editar: 'acta-exhortacion',
    });
  }
  if (datos.tipoActuacion === TipoActuacion.CONSTATACION || esPas) {
    secciones.push({
      clave: 'acta-fiscalizacion',
      titulo: 'Acta de Fiscalización',
      detalle: datos.tieneActaFiscalizacion ? 'Registrada correctamente.' : 'Falta registrar el acta.',
      estado: estadoDe('acta-fiscalizacion'),
      icono: ICONOS.acta,
      editar: 'acta-fiscalizacion',
    });
  }
  if (esPas) {
    secciones.push({
      clave: 'notificacion-cargo',
      titulo: 'Notificación de Cargo',
      detalle: datos.tieneNotificacionCargo ? 'Registrada correctamente.' : 'Falta registrar la NC.',
      estado: estadoDe('notificacion-cargo'),
      icono: ICONOS.notificacion,
      editar: 'notificacion-cargo',
    });
    if (datos.tieneNotificacionCargo) {
      secciones.push({
        clave: 'notificacion-entrega',
        titulo: 'Entrega de Notificación',
        detalle: datos.entregaNcTexto ?? 'Todavía no se respondió si se entregó en el acto.',
        estado: estadoDe('notificacion-entrega'),
        icono: ICONOS.entrega,
        editar: 'notificacion-entrega',
      });
    }
    secciones.push({
      clave: 'adicionales',
      titulo: 'Actas Adicionales',
      detalle: `${datos.totalAdicionales} registrada(s).`,
      estado: 'opcional',
      etiqueta: 'Opcional',
      icono: ICONOS.adicionales,
    });
  }
  secciones.push(
    {
      clave: 'fotos',
      titulo: 'Evidencia Fotográfica',
      detalle: datos.totalFotos > 0 ? `${datos.totalFotos} fotografía(s) adjuntada(s).` : 'Falta adjuntar al menos 1 fotografía.',
      estado: estadoDe('fotos'),
      etiqueta: `${datos.totalFotos} foto(s)`,
      icono: ICONOS.fotos,
      editar: 'fotos',
    },
    {
      clave: 'firma',
      titulo: 'Firma del Inspector',
      detalle: datos.tieneFirmaInspector ? 'Firma digital registrada y validada.' : 'Falta capturar la firma del inspector.',
      estado: estadoDe('firma'),
      icono: ICONOS.firma,
      editar: 'firma',
    },
  );

  const obligatorias = secciones.filter((x) => x.estado !== 'opcional');
  const completas = obligatorias.filter((x) => x.estado === 'ok').length;
  const porcentaje = Math.round((completas / obligatorias.length) * 100);

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

      {/* Avance de requisitos */}
      <div className={cn(tarjetaSuave, 'p-4 mb-4')} role={faltantes.length > 0 ? 'alert' : undefined}>
        <div className="flex items-center gap-3.5">
          <div className={cn(iconoTarjeta, faltantes.length > 0 ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success')}>
            {faltantes.length > 0
              ? svg(<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>)
              : svg(<polyline points="20 6 9 17 4 12" />)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.9375rem] font-bold text-text-title leading-tight">
              {faltantes.length > 0 ? `Faltan ${faltantes.length} requisito${faltantes.length === 1 ? '' : 's'}` : 'Todo listo para cerrar'}
            </div>
            <div className="text-xs text-text-muted mt-0.5 leading-snug">
              {faltantes.length > 0
                ? 'Completa las secciones marcadas antes de finalizar.'
                : 'La intervención tiene todos los datos requeridos para su cierre.'}
            </div>
          </div>
          <div className="font-titulo text-[1.375rem] font-black text-campo-700 leading-none shrink-0">
            {completas}/{obligatorias.length}
          </div>
        </div>
        <div className="w-full h-2 bg-bg-subtle rounded-pill overflow-hidden mt-3.5">
          <div
            className={cn('h-full rounded-pill transition-[width] duration-300', faltantes.length > 0 ? 'bg-warning' : 'bg-success')}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Secciones */}
      <div className={cn(tarjetaSuave, 'overflow-hidden mb-4')}>
        {secciones.map((seccion) => (
          <div
            key={seccion.clave}
            className={cn(
              'flex items-start gap-3.5 px-4 py-3.5 border-0 border-b border-solid border-border last:border-b-0',
              seccion.estado === 'falta' && 'bg-warning-bg/40',
            )}
          >
            <div className={cn(iconoTarjeta, 'w-10 h-10', COLOR_ICONO[seccion.estado])}>{seccion.icono}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[0.9375rem] font-bold text-text-title leading-tight">{seccion.titulo}</span>
                {(seccion.etiqueta || seccion.estado === 'falta') && (
                  <span className={cn(chipEstado, COLOR_CHIP[seccion.estado])}>
                    {seccion.estado === 'falta' && !seccion.etiqueta ? 'Falta' : seccion.etiqueta}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted mt-1 leading-snug break-words">{seccion.detalle}</div>
            </div>
            {seccion.editar && (
              <button type="button" className={btnEditar} onClick={() => onEditar(seccion.editar!)} aria-label={`Editar ${seccion.titulo}`}>
                Editar
              </button>
            )}
          </div>
        ))}
      </div>

      {modoEdicion && (
        <div className={cn(tarjetaSuave, 'p-4 mb-4')}>
          <label className={cn(campoRelleno, 'items-start')} htmlFor="comentario-correccion">
            <span className="flex-1 min-w-0">
              <span className={cn(campoRellenoEtiqueta, "after:content-['_*'] after:text-danger")}>¿Qué se corrigió?</span>
              <textarea
                id="comentario-correccion"
                className={cn(campoRellenoInput, 'resize-y min-h-20 text-[0.9375rem] font-medium leading-snug')}
                rows={3}
                placeholder="Ej. Corregí el número de DNI del administrado, que estaba mal digitado."
                value={comentarioCorreccion}
                onChange={(e) => setComentarioCorreccion(e.target.value)}
                disabled={finalizando}
              />
            </span>
          </label>
          <p className="text-xs text-text-muted mt-1.5 mb-0 px-1">
            Obligatorio - el validador necesita saber qué cambió antes de revisarlo de nuevo.
          </p>
        </div>
      )}

      {error && (
        <div className={cn(alerta('error'), 'mb-[1.25rem]!')} role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2.5 mt-6">
        <button type="button" className={btnCampo} onClick={handleFinalizar} disabled={!puedeEnviar}>
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
