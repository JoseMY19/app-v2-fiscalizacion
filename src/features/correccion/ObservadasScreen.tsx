import { useEffect, useState } from 'react';
import { listarObservadas, obtenerBundleIntervencion, type IntervencionObservada } from './intervenciones-observadas.repository';
import { rehidratarDesdeServidor } from './rehidratar-intervencion.repository';

/**
 * V-01/V-02: bandeja del propio fiscalizador de intervenciones devueltas
 * por el validador. No es un paso del wizard — es la puerta de entrada al
 * modo edición: al tocar "Corregir" se trae el bundle completo del
 * servidor, se rehidrata en Dexie, y recién ahí se abre el wizard
 * existente en modo edición (mismo flujo de HU-01 a HU-21, precargado).
 */
interface Props {
  onCorregir: (localId: string) => void;
  onVolver: () => void;
}

export default function ObservadasScreen({ onCorregir, onVolver }: Props) {
  const [items, setItems] = useState<IntervencionObservada[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargandoId, setCargandoId] = useState<string | null>(null);

  useEffect(() => {
    listarObservadas()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la lista. Revisa tu conexión.'));
  }, []);

  async function handleCorregir(id: string) {
    setCargandoId(id);
    setError(null);
    try {
      const bundle = await obtenerBundleIntervencion(id);
      await rehidratarDesdeServidor(bundle);
      onCorregir(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la intervención para corregirla.');
    } finally {
      setCargandoId(null);
    }
  }

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
          <h1 className="screen-header-title">Intervenciones observadas</h1>
          <p className="screen-header-subtitle">Expedientes que requieren subsanación</p>
        </div>
        {items && items.length > 0 && (
          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
            {items.length}
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
          <span>{error}</span>
        </div>
      )}

      {items === null && !error && (
        <p style={{ color: 'var(--color-text-muted)' }}>Cargando…</p>
      )}

      {items && items.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)' }}>No tienes intervenciones observadas pendientes de corrección.</p>
      )}

      {items?.map((item) => (
        <div key={item.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
            <div>
              <strong>{item.numeroExpediente}</strong>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-body)' }}>{item.motivo}</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={cargandoId === item.id}
              onClick={() => handleCorregir(item.id)}
            >
              {cargandoId === item.id ? 'Abriendo…' : 'Corregir'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
