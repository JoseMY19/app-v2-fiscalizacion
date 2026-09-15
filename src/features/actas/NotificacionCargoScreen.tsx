import { useEffect, useState } from 'react';
import { TipoActa, type BaseCalculo } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import SelectorCodigoParaActa from '../cuis/SelectorCodigoParaActa';
import SelectorBaseCalculoYMonto from '../uit/SelectorBaseCalculoYMonto';
import { guardarNotificacionCargo } from './notificacion-cargo.repository';
import type { SeleccionCuisConDetalle } from '../cuis/intervencion-cuis.repository';
import CampoNumeroCorrelativo from './CampoNumeroCorrelativo';
import { useVerificacionCorrelativo } from './useVerificacionCorrelativo';
import AdjuntarFotoActa from '../evidencia/AdjuntarFotoActa';

/**
 * HU-13 — Levantar Notificación de Cargo (camino C).
 * "Hereda automáticamente administrado, código CUIS y GPS ya capturados —
 * cero doble digitación": se muestran solo lectura, no se vuelven a pedir.
 * A propósito no pide fechaNotificacion ni modoNotificacion — son HU-20/21,
 * fuera de este alcance. fechaDeteccion se hereda de la intervención.
 */

import WizardHeader from '../../components/WizardHeader';

interface Props {
  localId: string;
  onGuardada: () => void;
  onVolver: () => void;
}

interface ResumenHeredado {
  administrado: string;
  ubicacion: string;
}

export default function NotificacionCargoScreen({ localId, onGuardada, onVolver }: Props) {
  const [fechaIntervencion, setFechaIntervencion] = useState<Date | null>(null);
  const [resumen, setResumen] = useState<ResumenHeredado | null>(null);
  const [seleccion, setSeleccion] = useState<SeleccionCuisConDetalle | null>(null);
  const [resultadoCalculo, setResultadoCalculo] = useState<{ baseCalculo: BaseCalculo; monto: number | null } | null>(
    null,
  );
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');
  const [medidaComplementaria, setMedidaComplementaria] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tieneFotoActa, setTieneFotoActa] = useState(false);

  useEffect(() => {
    Promise.all([db.administrados.get(localId), db.intervenciones.get(localId)]).then(([administrado, intervencion]) => {
      setResumen({
        administrado: administrado?.identificado
          ? `${administrado.nombresRazonSocial ?? '(sin nombre)'} — ${administrado.numeroDocumento ?? '(sin documento)'}`
          : 'No identificado (HU-05)',
        ubicacion: intervencion?.latitud
          ? `${intervencion.latitud.toFixed(5)}, ${intervencion.longitud?.toFixed(5)}`
          : intervencion?.direccionAproximada ?? '(sin ubicación)',
      });
      if (intervencion) setFechaIntervencion(new Date(intervencion.fechaHoraInicio));
    });
    db.notificacionesCargo.get(localId).then((nc) => {
      if (!nc) return;
      setNumeroCorrelativo(nc.numeroCorrelativo);
      setMedidaComplementaria(nc.medidaComplementaria ?? '');
    });
  }, [localId]);

  const estadoCorrelativo = useVerificacionCorrelativo(TipoActa.NOTIFICACION_CARGO, numeroCorrelativo, localId);

  const puedeGuardar =
    numeroCorrelativo.trim().length > 0 &&
    estadoCorrelativo !== 'duplicado' &&
    resultadoCalculo !== null &&
    fechaIntervencion !== null &&
    tieneFotoActa;

  async function handleGuardar() {
    if (!puedeGuardar || !resultadoCalculo || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarNotificacionCargo(localId, {
        numeroCorrelativo,
        baseCalculo: resultadoCalculo.baseCalculo,
        montoPasibleMulta: resultadoCalculo.monto,
        medidaComplementaria,
      });
      onGuardada();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la Notificación de Cargo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="app-container">
      <WizardHeader
        pasoActual={6}
        totalPasos={8}
        titulo="Notificación de Cargo (NC)"
        subtitulo="Acto formal de imputación de cargos en el procedimiento sancionador"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      {/* Tarjeta de Datos Heredados */}
      <div className="card" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
          Datos Heredados de la Intervención
        </h2>
        <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
          <strong>Administrado:</strong> {resumen?.administrado ?? 'Cargando…'}
        </p>
        <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          <strong>Ubicación:</strong> {resumen?.ubicacion ?? 'Cargando…'}
        </p>

        <SelectorCodigoParaActa localId={localId} onElegido={setSeleccion} />
      </div>

      {/* Tarjeta de Datos de la NC */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          Datos de la Notificación de Cargo
        </h2>

        <CampoNumeroCorrelativo value={numeroCorrelativo} onChange={setNumeroCorrelativo} estado={estadoCorrelativo} />

        {fechaIntervencion && (
          <SelectorBaseCalculoYMonto
            porcentajeUit={seleccion?.escala?.porcentaje}
            fecha={fechaIntervencion}
            onResultado={setResultadoCalculo}
          />
        )}

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Medida complementaria sugerida (opcional)
          </label>
          <input
            type="text"
            className="form-input"
            value={medidaComplementaria}
            onChange={(e) => setMedidaComplementaria(e.target.value)}
            placeholder="Ej. Clausura temporal, decomiso o demolición"
          />
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      <AdjuntarFotoActa
        intervencionLocalId={localId}
        actaTipo="NOTIFICACION_CARGO"
        obligatoria
        onCambio={setTieneFotoActa}
      />

      <div className="actions-footer">
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
        >
          {guardando ? (
            <span>Guardando…</span>
          ) : (
            <>
              <span>Guardar Notificación de Cargo</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
