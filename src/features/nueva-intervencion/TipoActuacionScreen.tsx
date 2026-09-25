import { useEffect, useState } from 'react';
import { TipoActuacion } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { seleccionarCaminoIntervencion } from './intervenciones.repository';

/**
 * HU-10 — Determinar el tipo de actuación (camino A/B/C).
 * Solo enruta: persiste el camino elegido y avisa al wizard para que
 * habilite las actas correspondientes (HU-11/12/13). El cierre sin NC en
 * A/B (HU-15) vive en esas pantallas siguientes, no aquí.
 */

import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import { actionsFooter, badge, appContainer, btn, card, formLabel, formLabelRequired, optionCard, optionCardContent, optionCardDesc, optionCardTitle, optionRadio, optionRadioDot, optionsGrid } from '../../lib/ui';

const OPCIONES: { valor: TipoActuacion; titulo: string; tipo: string; badgeClase: 'primary' | 'success' | 'warning'; descripcion: string }[] = [
  {
    valor: TipoActuacion.EXHORTACION,
    titulo: 'Solo Exhortación',
    tipo: 'Preventivo',
    badgeClase: 'primary',
    descripcion: 'Levanta Acta de Exhortación con plazo de subsanación voluntaria, sin notificación de cargo.',
  },
  {
    valor: TipoActuacion.CONSTATACION,
    titulo: 'Solo Constatación',
    tipo: 'Informativo',
    badgeClase: 'success',
    descripcion: 'Levanta Acta de Fiscalización dejando constancia de hechos sin infracción sancionable.',
  },
  {
    valor: TipoActuacion.INICIA_PAS,
    titulo: 'Inicia PAS',
    tipo: 'Sancionador',
    badgeClase: 'warning',
    descripcion: 'Levanta Acta de Fiscalización Municipal y Notificación de Cargo para inicio de PAS formal.',
  },
];

interface Props {
  localId: string;
  onElegido: (camino: TipoActuacion) => void;
  onVolver: () => void;
}

export default function TipoActuacionScreen({ localId, onElegido, onVolver }: Props) {
  const [camino, setCamino] = useState<TipoActuacion | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    db.intervenciones.get(localId).then((intervencion) => {
      if (intervencion?.tipoActuacion) setCamino(intervencion.tipoActuacion);
    });
  }, [localId]);

  async function handleContinuar() {
    if (!camino || guardando) return;
    setGuardando(true);
    try {
      await seleccionarCaminoIntervencion(localId, camino);
      onElegido(camino);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={5}
        totalPasos={8}
        titulo="Tipo de Actuación"
        subtitulo="Determina la vía legal y administrativa aplicable a esta intervención"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      <div className={card()}>
        <label className={cn(formLabel, formLabelRequired, 'mb-[0.875rem]!')}>
          Selecciona cómo se cierra esta intervención:
        </label>

        <div className={optionsGrid}>
          {OPCIONES.map((opcion) => {
            const isSelected = camino === opcion.valor;
            return (
              <div
                key={opcion.valor}
                className={cn(optionCard(isSelected), 'p-[1rem]!')}
                onClick={() => setCamino(opcion.valor)}
                role="button"
                tabIndex={0}
              >
                <div className={optionRadio(isSelected)}>
                  <div className={optionRadioDot(isSelected)} />
                </div>
                <div className={optionCardContent}>
                  <div className="flex items-center justify-between gap-[0.5rem]">
                    <span className={optionCardTitle}>{opcion.titulo}</span>
                    <span className={badge(opcion.badgeClase)}>{opcion.tipo}</span>
                  </div>
                  <div className={cn(optionCardDesc, 'mt-[0.25rem]!')}>
                    {opcion.descripcion}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={actionsFooter}>
        <button
          type="button"
          className={btn('primary', { tamano: 'lg', block: true })}
          onClick={handleContinuar}
          disabled={!camino || guardando}
        >
          {guardando ? (
            <span>Guardando…</span>
          ) : (
            <>
              <span>Continuar a las Actas</span>
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
