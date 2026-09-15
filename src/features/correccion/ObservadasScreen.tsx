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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.125rem', margin: 0 }}>Intervenciones observadas</h1>
        <button type="button" className="btn btn-sm btn-outline" onClick={onVolver}>
          Volver
        </button>
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
