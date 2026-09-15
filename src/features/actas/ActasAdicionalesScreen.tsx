import { useEffect, useState } from 'react';
import { listarCuisSeleccionadosConDetalle } from '../cuis/intervencion-cuis.repository';
import { listarActasMedidaProvisional } from './acta-medida-provisional.repository';
import { listarActasValorizacionObra } from './acta-valorizacion-obra.repository';
import { listarActasAdicionales } from './acta-adicional.repository';
import FormActaMedidaProvisional from './FormActaMedidaProvisional';
import FormActaValorizacionObra from './FormActaValorizacionObra';
import FormActaAdicional from './FormActaAdicional';

/**
 * HU-14 — Levantar actas adicionales según el código CUIS (camino C, ya
 * con AFM+NC levantadas). "El sistema habilita" nunca significa "obliga":
 * cada tarjeta exige un toque explícito de "Habilitar", sugerida o no, así
 * nunca se crea un acta sin confirmación del fiscalizador.
 */

type TipoAdicional = 'MEDIDA_PROVISIONAL' | 'VALORIZACION_OBRA' | 'RETENCION_VEHICULO' | 'DECOMISO';

const TARJETAS: { tipo: TipoAdicional; titulo: string }[] = [
  { tipo: 'MEDIDA_PROVISIONAL', titulo: 'Medida Provisional (Clausura / Paralización)' },
  { tipo: 'VALORIZACION_OBRA', titulo: 'Valorización de Obra' },
  { tipo: 'RETENCION_VEHICULO', titulo: 'Retención de Vehículo' },
  { tipo: 'DECOMISO', titulo: 'Decomiso' },
];

interface Props {
  localId: string;
  onContinuar: () => void;
  onVolver: () => void;
}

import WizardHeader from '../../components/WizardHeader';

export default function ActasAdicionalesScreen({ localId, onContinuar, onVolver }: Props) {
  const [sugiereValorizacionObra, setSugiereValorizacionObra] = useState(false);
  const [habilitadas, setHabilitadas] = useState<Set<TipoAdicional>>(new Set());
  const [guardadas, setGuardadas] = useState<Record<TipoAdicional, number>>({
    MEDIDA_PROVISIONAL: 0,
    VALORIZACION_OBRA: 0,
    RETENCION_VEHICULO: 0,
    DECOMISO: 0,
  });

  useEffect(() => {
    listarCuisSeleccionadosConDetalle(localId).then((seleccionados) => {
      setSugiereValorizacionObra(seleccionados.some((s) => s.codigo.sugiereValorizacionObra));
    });
    // HU-19: precarga cuántas ya se guardaron (estas actas son N:1, no 1:1
    // — no hay "el" valor único que precargar en un formulario, pero sí
    // hay que mostrar lo ya hecho para no parecer que se perdió).
    Promise.all([
      listarActasMedidaProvisional(localId),
      listarActasValorizacionObra(localId),
      listarActasAdicionales(localId),
    ]).then(([medidas, valorizaciones, adicionales]) => {
      const conteos: Record<TipoAdicional, number> = {
        MEDIDA_PROVISIONAL: medidas.length,
        VALORIZACION_OBRA: valorizaciones.length,
        RETENCION_VEHICULO: adicionales.filter((a) => a.tipo === 'RETENCION_VEHICULO').length,
        DECOMISO: adicionales.filter((a) => a.tipo === 'DECOMISO').length,
      };
      setGuardadas(conteos);
      setHabilitadas((actual) => {
        const nuevo = new Set(actual);
        for (const tipo of TARJETAS.map((t) => t.tipo)) {
          if (conteos[tipo] > 0) nuevo.add(tipo);
        }
        return nuevo;
      });
    });
  }, [localId]);

  function habilitar(tipo: TipoAdicional) {
    setHabilitadas((actual) => new Set(actual).add(tipo));
  }

  function marcarGuardada(tipo: TipoAdicional) {
    setGuardadas((actual) => ({ ...actual, [tipo]: actual[tipo] + 1 }));
  }

  return (
    <div className="app-container">
      <WizardHeader
        pasoActual={6}
        totalPasos={8}
        titulo="Actas Adicionales y Medidas"
        subtitulo="Actas accesorias y medidas provisionales cautelares (opcionales)"
        onVolver={onVolver}
      />

      <div className="alert alert-info">
        Ninguna de estas actas es obligatoria. Habilita únicamente aquellas medidas cautelares o complementarias que se hayan ejecutado en el operativo.
      </div>

      {TARJETAS.map(({ tipo, titulo }) => {
        const sugerida = tipo === 'VALORIZACION_OBRA' && sugiereValorizacionObra;
        const estaHabilitada = habilitadas.has(tipo);
        const cantidadGuardada = guardadas[tipo];

        return (
          <div
            key={tipo}
            className={`card ${sugerida ? 'card--highlight' : ''}`}
            style={{ marginBottom: '1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1rem', margin: 0 }}>{titulo}</h2>
                  {sugerida && (
                    <span className="badge badge-warning">Sugerida por CUIS</span>
                  )}
                  {cantidadGuardada > 0 && (
                    <span className="badge badge-success">{cantidadGuardada} registrada(s)</span>
                  )}
                </div>
              </div>

              {!estaHabilitada && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => habilitar(tipo)}
                >
                  + Habilitar
                </button>
              )}
            </div>

            {estaHabilitada && (
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                {tipo === 'MEDIDA_PROVISIONAL' && (
                  <FormActaMedidaProvisional localId={localId} onGuardada={() => marcarGuardada(tipo)} />
                )}
                {tipo === 'VALORIZACION_OBRA' && (
                  <FormActaValorizacionObra localId={localId} onGuardada={() => marcarGuardada(tipo)} />
                )}
                {(tipo === 'RETENCION_VEHICULO' || tipo === 'DECOMISO') && (
                  <FormActaAdicional localId={localId} tipo={tipo} onGuardada={() => marcarGuardada(tipo)} />
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="actions-footer">
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={onContinuar}
        >
          <span>Continuar a Evidencia Fotográfica</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
