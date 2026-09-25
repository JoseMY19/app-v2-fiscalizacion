import { useEffect, useState } from 'react';
import { OrigenIntervencion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { actualizarOrigenIntervencion } from './intervenciones.repository';

/**
 * HU-03 — Registrar el origen de la intervención.
 * Criterios de aceptación (docs/backlog-sp1.md):
 *  - opciones: Denuncia / Inspección inopinada / Orden superior / Documento externo
 *  - si no es Inopinada, la referencia (memo / quién derivó) es obligatoria
 *  - no se puede avanzar sin seleccionar un origen
 */

import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import { actionsFooter, alerta, appContainer, btn, card, formGroup, formHint, formInput, formLabel, formLabelRequired, optionCard, optionCardContent, optionCardDesc, optionCardTitle, optionRadio, optionRadioDot, optionsGrid } from '../../lib/ui';

const OPCIONES: { valor: OrigenIntervencion; etiqueta: string; descripcion: string }[] = [
  { valor: OrigenIntervencion.DENUNCIA, etiqueta: 'Denuncia administrativa', descripcion: 'Por reclamo ciudadano o expediente de mesa de partes' },
  { valor: OrigenIntervencion.INOPINADA, etiqueta: 'Inspección inopinada', descripcion: 'Patrullaje o fiscalización directa en campo' },
  { valor: OrigenIntervencion.ORDEN_SUPERIOR, etiqueta: 'Orden superior', descripcion: 'Disposición de Gerencia / Subgerencia de Control Municipal' },
  { valor: OrigenIntervencion.DOC_EXTERNO, etiqueta: 'Documento externo', descripcion: 'Oficio de PNP, Fiscalía, Defensa Civil u otra entidad' },
  { valor: OrigenIntervencion.OTROS, etiqueta: 'Otros', descripcion: 'Situación que no encaja en las categorías anteriores' },
];

interface Props {
  localId: string;
  onContinuar: () => void;
  onVolver: () => void;
}

export default function OrigenIntervencionScreen({ localId, onContinuar, onVolver }: Props) {
  const [origen, setOrigen] = useState<OrigenIntervencion | null>(null);
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HU-19: si ya se guardó un origen antes (volviendo desde el resumen o
  // desde un paso posterior), se precarga — nunca se pierde lo ya ingresado.
  useEffect(() => {
    db.intervenciones.get(localId).then((intervencion) => {
      if (intervencion?.origen) setOrigen(intervencion.origen);
      if (intervencion?.referenciaOrigen) setReferencia(intervencion.referenciaOrigen);
    });
  }, [localId]);

  const requiereReferencia = origen !== null && origen !== OrigenIntervencion.INOPINADA;
  const puedeContinuar = origen !== null && (!requiereReferencia || referencia.trim().length > 0);

  async function handleContinuar() {
    if (!puedeContinuar || !origen || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarOrigenIntervencion(localId, origen, referencia);
      onContinuar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el origen.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={2}
        totalPasos={8}
        titulo="Origen de la Intervención"
        subtitulo="Indica el motivo o antecedente que origina la acción de fiscalización"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      <div className={card()}>
        <label className={cn(formLabel, formLabelRequired, 'mb-[0.75rem]!')}>
          ¿Cuál es la procedencia de esta intervención?
        </label>

        <div className={optionsGrid}>
          {OPCIONES.map((opcion) => {
            const isSelected = origen === opcion.valor;
            return (
              <div
                key={opcion.valor}
                className={optionCard(isSelected)}
                onClick={() => setOrigen(opcion.valor)}
                role="button"
                tabIndex={0}
              >
                <div className={optionRadio(isSelected)}>
                  <div className={optionRadioDot(isSelected)} />
                </div>
                <div className={optionCardContent}>
                  <div className={optionCardTitle}>{opcion.etiqueta}</div>
                  <div className={optionCardDesc}>{opcion.descripcion}</div>
                </div>
              </div>
            );
          })}
        </div>

        {requiereReferencia && (
          <div className={cn(formGroup, 'mt-[1.25rem]! mb-0!')}>
            <label className={cn(formLabel, formLabelRequired)}>
              Referencia documental (N° de memo, expediente o remitente)
            </label>
            <input
              type="text"
              className={formInput}
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej. Memo N° 142-2026-SGCM-GSE/MDSJL"
              autoFocus
            />
            <span className={formHint}>Dato obligatorio para actuaciones derivadas.</span>
          </div>
        )}

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

      <div className={actionsFooter}>
        <button
          type="button"
          className={btn('primary', { tamano: 'lg', block: true })}
          onClick={handleContinuar}
          disabled={!puedeContinuar || guardando}
        >
          {guardando ? (
            <span>Guardando…</span>
          ) : (
            <>
              <span>Continuar</span>
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
