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
 */

import WizardHeader from '../../components/WizardHeader';

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
    captura.estado === 'capturado' || ((captura.estado === 'sin_senal' || captura.estado === 'permiso_denegado') && direccionAproximada.trim().length > 0);

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

  return (
    <div className="app-container">
      <WizardHeader
        pasoActual={1}
        totalPasos={8}
        titulo="Ubicación de la Intervención"
        subtitulo="Georreferenciación obligatoria en el lugar de los hechos"
        onVolver={onCancelar}
      />

      {/* Estado: Buscando señal GPS */}
      {(captura.estado === 'inactivo' || captura.estado === 'solicitando') && (
        <div className="card">
          <div className="gps-pulse-container">
            <div className="pulse-dot" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-primary-900)', fontSize: '0.9375rem' }}>
                Obteniendo ubicación GPS…
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Fijando satélites. Puede tardar hasta 15 segundos.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado: GPS fijado con éxito */}
      {captura.estado === 'capturado' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.125rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div className="card-icon-pin">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text-title)' }}>
                Coordenadas de Campo
              </span>
            </div>
            <span className="gps-status-chip">
              <span className="gps-status-chip-dot" />
              <span>GPS Activo</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Latitud</label>
              <input
                type="text"
                className="form-input"
                value={captura.latitud.toFixed(7)}
                readOnly
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Longitud</label>
              <input
                type="text"
                className="form-input"
                value={captura.longitud.toFixed(7)}
                readOnly
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Precisión satelital</label>
            <div className="gps-precision-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--color-primary-600)', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              <span>± {captura.precisionM.toFixed(1)} metros</span>
            </div>
            <span className="form-hint" style={{ marginTop: '0.35rem', display: 'block' }}>
              Capturado automáticamente por el sensor del dispositivo móvil.
            </span>
          </div>
        </div>
      )}

      {/* Estado: Sin señal o permiso denegado */}
      {(captura.estado === 'sin_senal' || captura.estado === 'permiso_denegado') && (
        <div className="card card--warning">
          <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
                {captura.estado === 'permiso_denegado'
                  ? 'Permiso de ubicación no otorgado'
                  : 'Sin señal GPS fija en 15 segundos'}
              </div>
              <div style={{ fontSize: '0.8125rem' }}>
                Puedes reintentar fijar señal o ingresar la dirección física aproximada como respaldo.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={solicitar}
            style={{ marginBottom: '1.25rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Reintentar fijación GPS</span>
          </button>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label form-label-required">
              Dirección aproximada (respaldo)
            </label>
            <input
              type="text"
              className="form-input"
              value={direccionAproximada}
              onChange={(e) => setDireccionAproximada(e.target.value)}
              placeholder="Ej. Av. Próceres de la Independencia 1500, SJL"
            />
            <span className="form-hint">Obligatoria si no hay coordenadas satelitales.</span>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="actions-footer">
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
        >
          {guardando ? (
            <span>Guardando ubicación…</span>
          ) : (
            <>
              <span>Guardar y Continuar</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
