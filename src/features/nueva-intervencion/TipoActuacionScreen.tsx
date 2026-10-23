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

import type { ReactNode } from 'react';
import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import { appContainer, btnCampo, opcionCheck, opcionIcono, opcionTarjeta, tarjetaSuave } from '../../lib/ui';

const svg = (contenido: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {contenido}
  </svg>
);

// Etiqueta del carácter de la vía (preventivo / informativo / sancionador).
const chipTipo = 'inline-flex items-center px-2 py-0.5 rounded-pill text-[0.6875rem] font-bold whitespace-nowrap border border-solid';

const OPCIONES: { valor: TipoActuacion; titulo: string; tipo: string; colorTipo: string; descripcion: string; icono: ReactNode }[] = [
  {
    valor: TipoActuacion.EXHORTACION,
    titulo: 'Solo Exhortación',
    tipo: 'Preventivo',
    colorTipo: 'bg-accent-100 border-primary-100 text-accent-600',
    descripcion: 'Levanta Acta de Exhortación con plazo de subsanación voluntaria, sin notificación de cargo.',
    icono: svg(<><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>),
  },
  {
    valor: TipoActuacion.CONSTATACION,
    titulo: 'Solo Constatación',
    tipo: 'Informativo',
    colorTipo: 'bg-success-bg border-success-border text-success',
    descripcion: 'Levanta Acta de Fiscalización dejando constancia de hechos sin infracción sancionable.',
    icono: svg(<><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>),
  },
  {
    valor: TipoActuacion.INICIA_PAS,
    titulo: 'Inicia PAS',
    tipo: 'Sancionador',
    colorTipo: 'bg-warning-bg border-warning-border text-warning',
    descripcion: 'Levanta Acta de Fiscalización Municipal y Notificación de Cargo para inicio de PAS formal.',
    icono: svg(<><path d="M14 13l-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10" /><path d="M16 16l6-6M8 8l6-6M9 7l8 8M21 11l-8-8" /></>),
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

      <div className={cn(tarjetaSuave, 'p-4')}>
        <p className="text-[0.9375rem] font-bold text-text-title mb-1">
          ¿Cómo se cierra esta intervención? <span className="text-danger">*</span>
        </p>
        <p className="text-xs text-text-muted mb-3.5">Define qué actas se levantarán en los siguientes pasos.</p>

        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Tipo de actuación">
          {OPCIONES.map((opcion) => {
            const seleccionada = camino === opcion.valor;
            return (
              <button
                key={opcion.valor}
                type="button"
                role="radio"
                aria-checked={seleccionada}
                className={cn(opcionTarjeta(seleccionada), 'items-start py-3.5')}
                onClick={() => setCamino(opcion.valor)}
              >
                <span className={opcionIcono(seleccionada)}>{opcion.icono}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[0.9375rem] font-bold leading-tight', seleccionada ? 'text-campo-800' : 'text-text-title')}>
                      {opcion.titulo}
                    </span>
                    <span className={cn(chipTipo, opcion.colorTipo)}>{opcion.tipo}</span>
                  </span>
                  <span className="block text-xs text-text-muted mt-1 leading-snug">{opcion.descripcion}</span>
                </span>
                <span className={cn(opcionCheck(seleccionada), 'mt-2.5')} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 mt-6">
        <button type="button" className={btnCampo} onClick={handleContinuar} disabled={!camino || guardando}>
          {guardando ? (
            <span>Guardando…</span>
          ) : (
            <>
              <span>Continuar a las Actas</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
