import { useEffect, useState } from 'react';
import { TipoActa, type BaseCalculo } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import SelectorCodigoParaActa from '../cuis/SelectorCodigoParaActa';
import SelectorBaseCalculoYMonto from '../uit/SelectorBaseCalculoYMonto';
import { guardarActaExhortacion } from './acta-exhortacion.repository';
import type { SeleccionCuisConDetalle } from '../cuis/intervencion-cuis.repository';
import CampoNumeroCorrelativo from './CampoNumeroCorrelativo';
import { useVerificacionCorrelativo } from './useVerificacionCorrelativo';
import AdjuntarFotoActa from '../evidencia/AdjuntarFotoActa';
import EscanearActaOcr from './EscanearActaOcr';
import type { DatosOcrActa } from '../../lib/ocr-offline';

/**
 * HU-11 — Levantar Acta de Exhortación (camino A).
 * Criterios: código de infracción, presunta infracción, medida
 * provisional/complementaria si aplica, monto posible de deuda, plazo de
 * subsanación, observaciones. "Código" y "medida provisional" se heredan
 * de HU-07/08 (solo lectura); "medida complementaria" queda fuera por dato
 * no confiable (ver docs/cuis/reporte-calidad.md).
 */

import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import { actionsFooter, alerta, appContainer, btn, card, formGroup, formInput, formLabel, formLabelRequired, formTextarea } from '../../lib/ui';

interface Props {
  localId: string;
  onGuardada: () => void;
  onVolver: () => void;
}

export default function ActaExhortacionScreen({ localId, onGuardada, onVolver }: Props) {
  const [fechaIntervencion, setFechaIntervencion] = useState<Date | null>(null);
  const [seleccion, setSeleccion] = useState<SeleccionCuisConDetalle | null>(null);
  const [resultadoCalculo, setResultadoCalculo] = useState<{ baseCalculo: BaseCalculo; monto: number | null } | null>(
    null,
  );
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');
  const [presuntaInfraccion, setPresuntaInfraccion] = useState('');
  const [plazoSubsanacion, setPlazoSubsanacion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tieneFotoActa, setTieneFotoActa] = useState(false);

  useEffect(() => {
    db.intervenciones.get(localId).then((intervencion) => {
      if (intervencion) setFechaIntervencion(new Date(intervencion.fechaHoraInicio));
    });
    // HU-19: precarga el acta ya guardada (baseCalculo/monto se recalculan
    // al re-elegir, ver SelectorBaseCalculoYMonto — no es texto que se pierda).
    db.actasExhortacion.get(localId).then((acta) => {
      if (!acta) return;
      setNumeroCorrelativo(acta.numeroCorrelativo);
      setPresuntaInfraccion(acta.presuntaInfraccion);
      setPlazoSubsanacion(acta.plazoSubsanacion ?? '');
      setObservaciones(acta.observaciones ?? '');
    });
  }, [localId]);

  const estadoCorrelativo = useVerificacionCorrelativo(TipoActa.EXHORTACION, numeroCorrelativo, localId);

  function handleSugerenciasOcr(datos: DatosOcrActa) {
    if (datos.numeroCorrelativo) setNumeroCorrelativo(datos.numeroCorrelativo);
    if (datos.presuntaInfraccion) setPresuntaInfraccion(datos.presuntaInfraccion);
    if (datos.plazoSubsanacion) setPlazoSubsanacion(datos.plazoSubsanacion);
    if (datos.observaciones) setObservaciones(datos.observaciones);
  }

  const puedeGuardar =
    numeroCorrelativo.trim().length > 0 &&
    estadoCorrelativo !== 'duplicado' &&
    presuntaInfraccion.trim().length > 0 &&
    resultadoCalculo !== null &&
    fechaIntervencion !== null &&
    tieneFotoActa;

  async function handleGuardar() {
    if (!puedeGuardar || !resultadoCalculo || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarActaExhortacion(localId, {
        numeroCorrelativo,
        presuntaInfraccion,
        baseCalculo: resultadoCalculo.baseCalculo,
        montoPosibleDeuda: resultadoCalculo.monto,
        plazoSubsanacion,
        observaciones,
      });
      onGuardada();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el acta.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={6}
        totalPasos={8}
        titulo="Acta de Exhortación"
        subtitulo="Medida preventiva municipal con plazo de adecuación voluntaria"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      <div className={card()}>
        <EscanearActaOcr tipoActa="EXHORTACION" onSugerencias={handleSugerenciasOcr} />

        <SelectorCodigoParaActa localId={localId} onElegido={setSeleccion} />

        {seleccion?.escala?.medidaProvisional && (
          <div className={cn(alerta('warning'), 'mb-[1rem]!')}>
            <strong>Medida provisional aplicable:</strong> {seleccion.escala.medidaProvisional}
          </div>
        )}

        <CampoNumeroCorrelativo value={numeroCorrelativo} onChange={setNumeroCorrelativo} estado={estadoCorrelativo} />

        <div className={formGroup}>
          <label className={cn(formLabel, formLabelRequired)}>
            Presunta infracción constatada
          </label>
          <textarea
            className={formTextarea}
            value={presuntaInfraccion}
            onChange={(e) => setPresuntaInfraccion(e.target.value)}
            rows={3}
            placeholder="Describe brevemente el hecho constatado susceptible de subsanación..."
          />
        </div>

        {fechaIntervencion && (
          <SelectorBaseCalculoYMonto
            porcentajeUit={seleccion?.escala?.porcentaje}
            fecha={fechaIntervencion}
            onResultado={setResultadoCalculo}
          />
        )}

        <div className={formGroup}>
          <label className={formLabel}>Plazo de subsanación voluntaria (opcional)</label>
          <input
            type="text"
            className={formInput}
            value={plazoSubsanacion}
            onChange={(e) => setPlazoSubsanacion(e.target.value)}
            placeholder="Ej. 5 días hábiles"
          />
        </div>

        <div className={cn(formGroup, 'mb-0!')}>
          <label className={formLabel}>Observaciones adicionales (opcional)</label>
          <textarea
            className={formTextarea}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Comentarios o descargos iniciales del administrado..."
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
        actaTipo="ACTA_EXHORTACION"
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
              <span>Guardar Acta de Exhortación</span>
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
