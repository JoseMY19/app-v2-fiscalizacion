import { useEffect, useState } from 'react';
import { TipoActuacion } from '@pas-sjl/shared-types';
import { listarMisTramites, type MiTramiteItem } from './mis-tramites.repository';

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
    <div className="app-container">
      <div className="screen-header-card">
        <button
          type="button"
          className="btn-icon-back"
          onClick={onVolver}
          aria-label="Volver al inicio"
          title="Volver"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="screen-header-info">
          <h1 className="screen-header-title">Mis trámites</h1>
          <p className="screen-header-subtitle">Historial de actuaciones sincronizadas</p>
        </div>
        {items && items.length > 0 && (
          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
            {items.length}
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
          <span>{error}</span>
        </div>
      )}

      {items === null && !error && <p style={{ color: 'var(--color-text-muted)' }}>Cargando…</p>}

      {items && items.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)' }}>Todavía no tienes intervenciones sincronizadas.</p>
      )}

      {items?.map((item) => (
        <div key={item.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div>
              <strong>{item.numeroExpediente?.trim() || TITULO_CAMINO[item.tipoActuacion] || item.tipoActuacion}</strong>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {new Date(item.fechaHoraInicio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' · '}
                {TITULO_CAMINO[item.tipoActuacion] ?? item.tipoActuacion}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-body)' }}>{item.estadoGeneral}</p>
            </div>
            {item.requiereAccionTuya && <span className="badge badge-warning">Acción requerida</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
