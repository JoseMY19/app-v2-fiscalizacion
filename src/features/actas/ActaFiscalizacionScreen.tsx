import { useEffect, useState } from 'react';
import { TipoActa } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { guardarActaFiscalizacion, HECHOS_VERIFICADOS_MIN_CARACTERES, validarHechosVerificados } from './acta-fiscalizacion.repository';
import CampoNumeroCorrelativo from './CampoNumeroCorrelativo';
import { useVerificacionCorrelativo } from './useVerificacionCorrelativo';
import AdjuntarFotoActa from '../evidencia/AdjuntarFotoActa';

/**
 * HU-12 — Levantar Acta de Fiscalización Municipal (caminos B y C).
 * Criterios: hechos verificados (obligatorio, mínimo de caracteres) y
 * observaciones del administrado. Sin campos de CUIS/monto — el modelo
 * real (Prisma) no los tiene, esos ya se vieron en HU-07/08.
 */

import WizardHeader from '../../components/WizardHeader';

interface Props {
  localId: string;
  onGuardada: () => void;
  onVolver: () => void;
}

export default function ActaFiscalizacionScreen({ localId, onGuardada, onVolver }: Props) {
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');
  const [hechosVerificados, setHechosVerificados] = useState('');
  const [observacionesAdministrado, setObservacionesAdministrado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tieneFotoActa, setTieneFotoActa] = useState(false);

  useEffect(() => {
    db.actasFiscalizacion.get(localId).then((acta) => {
      if (!acta) return;
      setNumeroCorrelativo(acta.numeroCorrelativo);
      setHechosVerificados(acta.hechosVerificados);
      setObservacionesAdministrado(acta.observacionesAdministrado ?? '');
    });
  }, [localId]);

  const estadoCorrelativo = useVerificacionCorrelativo(TipoActa.FISCALIZACION, numeroCorrelativo, localId);

  const puedeGuardar =
    numeroCorrelativo.trim().length > 0 &&
    estadoCorrelativo !== 'duplicado' &&
    validarHechosVerificados(hechosVerificados) === null &&
    tieneFotoActa;

  async function handleGuardar() {
    if (!puedeGuardar || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarActaFiscalizacion(localId, { numeroCorrelativo, hechosVerificados, observacionesAdministrado });
      onGuardada();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el acta.');
    } finally {
      setGuardando(false);
    }
  }

  const longitudHechos = hechosVerificados.trim().length;
  const cumpleMinimo = longitudHechos >= HECHOS_VERIFICADOS_MIN_CARACTERES;

  return (
    <div className="app-container">
      <WizardHeader
        pasoActual={6}
        totalPasos={8}
        titulo="Acta de Fiscalización Municipal"
        subtitulo="Constatación formal de hechos y circunstancias en el lugar inspeccionado"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      <div className="card">
        <CampoNumeroCorrelativo value={numeroCorrelativo} onChange={setNumeroCorrelativo} estado={estadoCorrelativo} />

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <label className="form-label form-label-required" style={{ marginBottom: 0 }}>
              Hechos verificados
            </label>
            <span className={`badge ${cumpleMinimo ? 'badge-success' : 'badge-warning'}`}>
              {longitudHechos}/{HECHOS_VERIFICADOS_MIN_CARACTERES} car. mín.
            </span>
          </div>
          <textarea
            className="form-textarea"
            value={hechosVerificados}
            onChange={(e) => setHechosVerificados(e.target.value)}
            rows={5}
            placeholder="Detalle circunstanciado y objetivo de lo observado por el fiscalizador en la inspección..."
          />
          <span className="form-hint">
            Mínimo {HECHOS_VERIFICADOS_MIN_CARACTERES} caracteres para validez probatoria.
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Observaciones formuladas por el administrado (opcional)
          </label>
          <textarea
            className="form-textarea"
            value={observacionesAdministrado}
            onChange={(e) => setObservacionesAdministrado(e.target.value)}
            rows={3}
            placeholder="Manifestación, descargos o precisiones expresadas por el administrado presente..."
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
        actaTipo="ACTA_FISCALIZACION"
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
            <span>Guardando acta…</span>
          ) : (
            <>
              <span>Guardar Acta de Fiscalización</span>
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
