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

import type { ReactNode } from 'react';
import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import {
  alerta,
  appContainer,
  btnCampo,
  campoRelleno,
  campoRellenoEtiqueta,
  campoRellenoIcono,
  campoRellenoInput,
  opcionCheck,
  opcionIcono,
  opcionTarjeta,
  tarjetaSuave,
} from '../../lib/ui';

const icono = (contenido: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {contenido}
  </svg>
);

const OPCIONES: { valor: OrigenIntervencion; etiqueta: string; descripcion: string; icono: ReactNode }[] = [
  {
    valor: OrigenIntervencion.DENUNCIA,
    etiqueta: 'Denuncia administrativa',
    descripcion: 'Por reclamo ciudadano o expediente de mesa de partes',
    icono: icono(<><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>),
  },
  {
    valor: OrigenIntervencion.INOPINADA,
    etiqueta: 'Inspección inopinada',
    descripcion: 'Patrullaje o fiscalización directa en campo',
    icono: icono(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></>),
  },
  {
    valor: OrigenIntervencion.ORDEN_SUPERIOR,
    etiqueta: 'Orden superior',
    descripcion: 'Disposición de Gerencia / Subgerencia de Control Municipal',
    icono: icono(<><path d="M3 21h18M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></>),
  },
  {
    valor: OrigenIntervencion.DOC_EXTERNO,
    etiqueta: 'Documento externo',
    descripcion: 'Oficio de PNP, Fiscalía, Defensa Civil u otra entidad',
    icono: icono(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>),
  },
  {
    valor: OrigenIntervencion.OTROS,
    etiqueta: 'Otros',
    descripcion: 'Situación que no encaja en las categorías anteriores',
    icono: icono(<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>),
  },
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

      <div className={cn(tarjetaSuave, 'p-4')}>
        <p className="text-[0.9375rem] font-bold text-text-title mb-1">¿Cuál es la procedencia de esta intervención?</p>
        <p className="text-xs text-text-muted mb-3.5">Elige una opción para continuar.</p>

        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Procedencia de la intervención">
          {OPCIONES.map((opcion) => {
            const seleccionada = origen === opcion.valor;
            return (
              <button
                key={opcion.valor}
                type="button"
                role="radio"
                aria-checked={seleccionada}
                className={opcionTarjeta(seleccionada)}
                onClick={() => setOrigen(opcion.valor)}
              >
                <span className={opcionIcono(seleccionada)}>{opcion.icono}</span>
                <span className="flex-1 min-w-0">
                  <span className={cn('block text-[0.9375rem] font-bold leading-tight', seleccionada ? 'text-campo-800' : 'text-text-title')}>
                    {opcion.etiqueta}
                  </span>
                  <span className="block text-xs text-text-muted mt-0.5 leading-snug">{opcion.descripcion}</span>
                </span>
                <span className={opcionCheck(seleccionada)} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>

        {requiereReferencia && (
          <div className="mt-4">
            <label className={campoRelleno} htmlFor="referencia-origen">
              <span className={campoRellenoIcono}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className={cn(campoRellenoEtiqueta, "after:content-['_*'] after:text-danger")}>Referencia documental</span>
                <input
                  id="referencia-origen"
                  type="text"
                  className={campoRellenoInput}
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej. Memo N° 142-2026-SGCM"
                  autoFocus
                />
              </span>
            </label>
            <p className="text-xs text-text-muted mt-1.5 mb-0 px-1">
              N° de memo, expediente o remitente. Obligatorio para actuaciones derivadas.
            </p>
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

      <div className="flex flex-col gap-2.5 mt-6">
        <button type="button" className={btnCampo} onClick={handleContinuar} disabled={!puedeContinuar || guardando}>
          {guardando ? (
            <span>Guardando…</span>
          ) : (
            <>
              <span>Continuar</span>
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
