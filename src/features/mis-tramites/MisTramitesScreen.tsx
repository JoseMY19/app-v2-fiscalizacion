import { useEffect, useState } from 'react';
import { TipoActuacion } from '@pas-sjl/shared-types';
import { listarMisTramites, type MiTramiteItem } from './mis-tramites.repository';
import { cn } from '../../lib/cn';
import { alerta, appContainer, badge, iconoTarjeta, tarjetaSuave } from '../../lib/ui';

/**
 * Pantalla nueva (pedido explícito, 2026-09-14): el fiscalizador pierde de
 * vista su intervención en cuanto sincroniza — esta pantalla le muestra en
 * qué va cada una en oficina (validación, instrucción, resolución), sin
 * exponer los enums crudos de esas tablas (mismo criterio de traducción a
 * texto humano que ya usa TipoActuacionScreen).
 */
const TITULO_CAMINO: Record<string, string> = {
  [TipoActuacion.EXHORTACION]: 'Solo Exhortación',
  [TipoActuacion.CONSTATACION]: 'Solo Constatación',
  [TipoActuacion.INICIA_PAS]: 'Inicia PAS',
};

const fechaCorta = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

const btnVolver =
  'w-10 h-10 rounded-full bg-campo-50 border border-solid border-campo-100 text-campo-700 flex items-center justify-center cursor-pointer shrink-0 ' +
  'transition-[background-color,transform] duration-150 hover:bg-campo-100 active:scale-95';
const resumenChip = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold border border-solid';
// Franja de estado al pie de cada trámite (estado en oficina).
const estadoFila = 'flex items-center gap-2 mt-3 px-3 py-2 rounded-[12px] text-[0.8125rem] font-medium';

interface Props {
  onVolver: () => void;
}

export default function MisTramitesScreen({ onVolver }: Props) {
  const [items, setItems] = useState<MiTramiteItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarMisTramites()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar tus trámites. Revisa tu conexión.'));
  }, []);

  const conAccion = items?.filter((item) => item.requiereAccionTuya).length ?? 0;

  return (
    <div className={appContainer}>
      {/* Cabecera */}
      <div className={cn(tarjetaSuave, 'px-4 py-4 mb-4')}>
        <div className="flex items-center gap-3">
          <button type="button" className={btnVolver} onClick={onVolver} aria-label="Volver al inicio" title="Volver">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-titulo text-[1.375rem] font-black text-text-title leading-none mb-1">Mis trámites</h1>
            <p className="text-xs text-text-muted m-0">Seguimiento de tus actuaciones en oficina</p>
          </div>
        </div>

        {items && items.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3.5 pt-3.5 border-0 border-t border-solid border-border">
            <span className={cn(resumenChip, 'bg-campo-50 border-campo-100 text-campo-700')}>
              <span className="font-bold">{items.length}</span> {items.length === 1 ? 'trámite' : 'trámites'}
            </span>
            {conAccion > 0 && (
              <span className={cn(resumenChip, 'bg-warning-bg border-warning-border text-warning')}>
                <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden="true" />
                <span className="font-bold">{conAccion}</span> requiere{conAccion === 1 ? '' : 'n'} tu acción
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className={alerta('error')} role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Cargando: tarjetas esqueleto */}
      {items === null && !error && (
        <div className="flex flex-col gap-3" aria-label="Cargando trámites">
          {[0, 1].map((i) => (
            <div key={i} className={cn(tarjetaSuave, 'p-4 flex items-center gap-3.5 animate-pulse')}>
              <div className={cn(iconoTarjeta, 'bg-bg-subtle')} />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 w-2/3 rounded-pill bg-bg-subtle" />
                <div className="h-3 w-1/2 rounded-pill bg-bg-subtle" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sin trámites */}
      {items && items.length === 0 && (
        <div className={cn(tarjetaSuave, 'px-6 py-8 text-center')}>
          <div className={cn(iconoTarjeta, 'w-14 h-14 rounded-full mx-auto mb-3 bg-campo-50 text-campo-700')}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </div>
          <p className="text-[0.9375rem] font-bold text-text-title mb-1">Aún no hay trámites</p>
          <p className="text-[0.8125rem] text-text-muted m-0">
            Cuando sincronices una intervención, aquí verás en qué va en oficina.
          </p>
        </div>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {items?.map((item) => (
          <div
            key={item.id}
            className={cn(tarjetaSuave, 'p-4 overflow-hidden', item.requiereAccionTuya && 'border-l-4 border-l-warning')}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={cn(
                  iconoTarjeta,
                  item.requiereAccionTuya ? 'bg-warning-bg text-warning' : 'bg-campo-50 text-campo-700',
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-text-title whitespace-nowrap overflow-hidden text-ellipsis tracking-[0.01em]">
                  {item.numeroExpediente?.trim() || TITULO_CAMINO[item.tipoActuacion] || item.tipoActuacion}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-muted">
                  <span>{fechaCorta.format(new Date(item.fechaHoraInicio))}</span>
                  <span aria-hidden="true">·</span>
                  <span className={cn(badge('neutral'), 'px-2 py-0.5 text-[0.6875rem]')}>
                    {TITULO_CAMINO[item.tipoActuacion] ?? item.tipoActuacion}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={cn(
                estadoFila,
                item.requiereAccionTuya ? 'bg-warning-bg text-warning' : 'bg-bg-subtle text-text-body',
              )}
            >
              <span
                className={cn('w-2 h-2 rounded-full shrink-0', item.requiereAccionTuya ? 'bg-warning' : 'bg-campo-600')}
                aria-hidden="true"
              />
              <span className="flex-1 min-w-0">{item.estadoGeneral}</span>
              {item.requiereAccionTuya && (
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.04em] shrink-0">Acción requerida</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
