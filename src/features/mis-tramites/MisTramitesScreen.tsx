import { useEffect, useState } from 'react';
import { TipoActuacion } from '@pas-sjl/shared-types';
import { listarMisTramites, type MiTramiteItem } from './mis-tramites.repository';
import { cn } from '../../lib/cn';
import { alerta, appContainer, badge, btnIconBack, card, screenHeaderCard, screenHeaderInfo, screenHeaderSubtitle, screenHeaderTitle } from '../../lib/ui';

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

  return (
    <div className={appContainer}>
      <div className={screenHeaderCard}>
        <button
          type="button"
          className={btnIconBack}
          onClick={onVolver}
          aria-label="Volver al inicio"
          title="Volver"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className={screenHeaderInfo}>
          <h1 className={screenHeaderTitle}>Mis trámites</h1>
          <p className={screenHeaderSubtitle}>Historial de actuaciones sincronizadas</p>
        </div>
        {items && items.length > 0 && (
          <span className={badge('neutral')}>
            {items.length}
          </span>
        )}
      </div>

      {error && (
        <div className={alerta('error')} role="alert">
          <span>{error}</span>
        </div>
      )}

      {items === null && !error && <p className="text-text-muted">Cargando…</p>}

      {items && items.length === 0 && (
        <p className="text-text-muted">Todavía no tienes intervenciones sincronizadas.</p>
      )}

      {items?.map((item) => (
        <div key={item.id} className={cn(card(), 'mb-3!')}>
          <div className="flex justify-between items-start gap-3">
            <div>
              <strong>{item.numeroExpediente?.trim() || TITULO_CAMINO[item.tipoActuacion] || item.tipoActuacion}</strong>
              <p className="mt-1 mb-0 text-[0.8125rem] text-text-muted">
                {new Date(item.fechaHoraInicio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' · '}
                {TITULO_CAMINO[item.tipoActuacion] ?? item.tipoActuacion}
              </p>
              <p className="mt-2 mb-0 text-sm text-text-body">{item.estadoGeneral}</p>
            </div>
            {item.requiereAccionTuya && <span className={badge('warning')}>Acción requerida</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
