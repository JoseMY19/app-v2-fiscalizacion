import { useEffect, useState } from 'react';
import { OrigenUbicacion } from '@pas-sjl/shared-types';
import { useCapturaUbicacion } from './useCapturaUbicacion';
import { crearIntervencionConUbicacion } from './intervenciones.repository';

/**
 * HU-01 — Capturar coordenadas GPS al iniciar.
 * Criterios de aceptación (docs/backlog-sp1.md):
 *  - al entrar aquí se solicita permiso de ubicación si no lo tiene
 *  - la coordenada se captura automáticamente, sin acción manual
 *  - si el GPS no fija señal en 15s: reintentar o dirección aproximada de respaldo
 *  - el campo de coordenadas es de solo lectura una vez capturado
 * Las coordenadas se capturan y guardan pero no se muestran: el fiscalizador
 * solo confirma la señal y registra la dirección aproximada (siempre obligatoria).
 */

import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import {
  alerta,
  appContainer,
  btnCampo,
  btnCampoSecundario,
  campoRelleno,
  campoRellenoEtiqueta,
  campoRellenoIcono,
  campoRellenoInput,
  iconoTarjeta,
  tarjetaSuave,
} from '../../lib/ui';

const chipEstado = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-bold whitespace-nowrap shrink-0 border border-solid';
const btnReintentar =
  'inline-flex items-center gap-1.5 bg-transparent border-none p-0 text-[0.8125rem] font-semibold text-campo-700 cursor-pointer hover:underline';

interface Props {
  onGuardado: (localId: string) => void;
  onCancelar: () => void;
}

export default function NuevaIntervencionScreen({ onGuardado, onCancelar }: Props) {
  const { captura, solicitar } = useCapturaUbicacion();
  const [direccionAproximada, setDireccionAproximada] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Se dispara solo al entrar a la pantalla — "al tocar Nueva intervención"
  // ya implica que el usuario quiere iniciar la captura, sin un botón aparte.
  useEffect(() => {
    solicitar();
  }, [solicitar]);

  const puedeGuardar =
    (captura.estado === 'capturado' || captura.estado === 'sin_senal' || captura.estado === 'permiso_denegado') &&
    direccionAproximada.trim().length > 0;

  async function handleGuardar() {
    if (!puedeGuardar || guardando) return;
    setGuardando(true);
    try {
      const localId =
        captura.estado === 'capturado'
          ? await crearIntervencionConUbicacion({
              origenUbicacion: OrigenUbicacion.GPS_AUTOMATICO,
              latitud: captura.latitud,
              longitud: captura.longitud,
              gpsPrecisionM: captura.precisionM,
              direccionAproximada: direccionAproximada.trim(),
            })
          : await crearIntervencionConUbicacion({
              origenUbicacion: OrigenUbicacion.DIRECCION_MANUAL,
              direccionAproximada: direccionAproximada.trim(),
            });
      onGuardado(localId);
    } finally {
      setGuardando(false);
    }
  }

  const campoDireccion = (
    <div>
      <label className={campoRelleno} htmlFor="direccion-aproximada">
        <span className={campoRellenoIcono}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span className="flex-1 min-w-0">
          <span className={cn(campoRellenoEtiqueta, "after:content-['_*'] after:text-danger")}>Dirección aproximada</span>
          <input
            id="direccion-aproximada"
            type="text"
            className={campoRellenoInput}
            value={direccionAproximada}
            onChange={(e) => setDireccionAproximada(e.target.value)}
            placeholder="Ej. Av. Próceres 1500, SJL"
          />
        </span>
      </label>
      <p className="text-xs text-text-muted mt-1.5 mb-0 px-1">
        {captura.estado === 'capturado'
          ? 'Referencia del lugar de los hechos para el expediente.'
          : 'Obligatoria si no hay coordenadas satelitales.'}
      </p>
    </div>
  );

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={1}
        totalPasos={8}
        titulo="Ubicación de la Intervención"
        subtitulo="Georreferenciación obligatoria en el lugar de los hechos"
        onVolver={onCancelar}
      />

      <div className={cn(tarjetaSuave, 'p-4 mb-4')}>
        {/* Estado: Buscando señal GPS */}
        {(captura.estado === 'inactivo' || captura.estado === 'solicitando') && (
          <div className="flex items-center gap-3.5">
            <div className={cn(iconoTarjeta, 'bg-campo-50 text-campo-700 relative')}>
              <span className="absolute inset-0 rounded-[12px] bg-campo-200 animate-ping opacity-40" aria-hidden="true" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="relative">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.9375rem] font-bold text-text-title">Obteniendo ubicación GPS…</div>
              <div className="text-xs text-text-muted">Fijando satélites. Puede tardar hasta 15 segundos.</div>
            </div>
          </div>
        )}

        {/* Estado: GPS fijado con éxito (las coordenadas se guardan sin mostrarse) */}
        {captura.estado === 'capturado' && (
          <>
            <div className="flex items-center gap-3.5 mb-4">
              <div className={cn(iconoTarjeta, 'bg-success-bg text-success')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.9375rem] font-bold text-text-title leading-tight">Ubicación capturada</div>
                <button type="button" className={cn(btnReintentar, 'mt-0.5')} onClick={solicitar}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Reintentar fijación GPS</span>
                </button>
              </div>
              <span className={cn(chipEstado, 'bg-success-bg border-success-border text-success')}>
                <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
                GPS activo
              </span>
            </div>

            {campoDireccion}
          </>
        )}

        {/* Estado: Sin señal o permiso denegado */}
        {(captura.estado === 'sin_senal' || captura.estado === 'permiso_denegado') && (
          <>
            <div className={cn(alerta('warning'), 'rounded-[14px] mb-4!')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <div className="font-semibold mb-[0.2rem]">
                  {captura.estado === 'permiso_denegado'
                    ? 'Permiso de ubicación no otorgado'
                    : 'Sin señal GPS fija en 15 segundos'}
                </div>
                <div className="text-[0.8125rem]">
                  Puedes reintentar fijar señal o ingresar la dirección física aproximada como respaldo.
                </div>
              </div>
            </div>

            <button type="button" className={cn(btnCampoSecundario, 'mb-4')} onClick={solicitar}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Reintentar fijación GPS</span>
            </button>

            {campoDireccion}
          </>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-2.5 mt-6">
        <button type="button" className={btnCampo} onClick={handleGuardar} disabled={!puedeGuardar || guardando}>
          {guardando ? (
            <span>Guardando ubicación…</span>
          ) : (
            <>
              <span>Guardar y Continuar</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <button type="button" className={btnCampoSecundario} onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
