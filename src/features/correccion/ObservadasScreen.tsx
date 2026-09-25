import { useEffect, useState } from 'react';
import { listarObservadas, obtenerBundleIntervencion, type IntervencionObservada } from './intervenciones-observadas.repository';
import { rehidratarDesdeServidor } from './rehidratar-intervencion.repository';
import { cn } from '../../lib/cn';
import { alerta, appContainer, badge, btn, btnIconBack, card, screenHeaderCard, screenHeaderInfo, screenHeaderSubtitle, screenHeaderTitle } from '../../lib/ui';

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
          <h1 className={screenHeaderTitle}>Intervenciones observadas</h1>
          <p className={screenHeaderSubtitle}>Expedientes que requieren subsanación</p>
        </div>
        {items && items.length > 0 && (
          <span className={badge('warning')}>
            {items.length}
          </span>
        )}
      </div>

      {error && (
        <div className={alerta('error')} role="alert">
          <span>{error}</span>
        </div>
      )}

      {items === null && !error && (
        <p className="text-text-muted">Cargando…</p>
      )}

      {items && items.length === 0 && (
        <p className="text-text-muted">No tienes intervenciones observadas pendientes de corrección.</p>
      )}

      {items?.map((item) => (
        <div key={item.id} className={cn(card(), 'mb-3!')}>
          <div className="flex justify-between items-center gap-3">
            <div>
              <strong>{item.numeroExpediente}</strong>
              <p className="mt-1 mb-0 text-sm text-text-body">{item.motivo}</p>
            </div>
            <button
              type="button"
              className={btn('primary', { tamano: 'sm' })}
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
