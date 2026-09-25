import { useEffect, useState } from 'react';
import { TipoActa } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { guardarActaFiscalizacion, HECHOS_VERIFICADOS_MIN_CARACTERES, validarHechosVerificados } from './acta-fiscalizacion.repository';
import CampoNumeroCorrelativo from './CampoNumeroCorrelativo';
import { useVerificacionCorrelativo } from './useVerificacionCorrelativo';
import AdjuntarFotoActa from '../evidencia/AdjuntarFotoActa';
import EscanearActaOcr from './EscanearActaOcr';
import type { DatosOcrActa } from '../../lib/ocr-offline';

/**
 * HU-12 — Levantar Acta de Fiscalización Municipal (caminos B y C).
 * Criterios: hechos verificados (obligatorio, mínimo de caracteres) y
 * observaciones del administrado. Sin campos de CUIS/monto — el modelo
 * real (Prisma) no los tiene, esos ya se vieron en HU-07/08.
 */

import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import { actionsFooter, alerta, appContainer, badge, btn, card, formGroup, formHint, formLabel, formLabelRequired, formTextarea } from '../../lib/ui';

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

  function handleSugerenciasOcr(datos: DatosOcrActa) {
    if (datos.numeroCorrelativo) setNumeroCorrelativo(datos.numeroCorrelativo);
    if (datos.hechosVerificados) setHechosVerificados(datos.hechosVerificados);
    if (datos.observacionesAdministrado) setObservacionesAdministrado(datos.observacionesAdministrado);
  }

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
    <div className={appContainer}>
      <WizardHeader
        pasoActual={6}
        totalPasos={8}
        titulo="Acta de Fiscalización Municipal"
        subtitulo="Constatación formal de hechos y circunstancias en el lugar inspeccionado"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      <div className={card()}>
        <EscanearActaOcr tipoActa="FISCALIZACION" onSugerencias={handleSugerenciasOcr} />

        <CampoNumeroCorrelativo value={numeroCorrelativo} onChange={setNumeroCorrelativo} estado={estadoCorrelativo} />

        <div className={formGroup}>
          <div className="flex items-center justify-between mb-[0.375rem]">
            <label className={cn(formLabel, formLabelRequired, 'mb-0!')}>
              Hechos verificados
            </label>
            <span className={badge(cumpleMinimo ? 'success' : 'warning')}>
              {longitudHechos}/{HECHOS_VERIFICADOS_MIN_CARACTERES} car. mín.
            </span>
          </div>
          <textarea
            className={formTextarea}
            value={hechosVerificados}
            onChange={(e) => setHechosVerificados(e.target.value)}
            rows={5}
            placeholder="Detalle circunstanciado y objetivo de lo observado por el fiscalizador en la inspección..."
          />
          <span className={formHint}>
            Mínimo {HECHOS_VERIFICADOS_MIN_CARACTERES} caracteres para validez probatoria.
          </span>
        </div>

        <div className={cn(formGroup, 'mb-0!')}>
          <label className={formLabel}>
            Observaciones formuladas por el administrado (opcional)
          </label>
          <textarea
            className={formTextarea}
            value={observacionesAdministrado}
            onChange={(e) => setObservacionesAdministrado(e.target.value)}
            rows={3}
            placeholder="Manifestación, descargos o precisiones expresadas por el administrado presente..."
          />
        </div>

        {error && (
          <div className={cn(alerta('error'), 'mt-[1rem]! mb-0!')} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
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

      <div className={actionsFooter}>
        <button
          type="button"
          className={btn('primary', { tamano: 'lg', block: true })}
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
