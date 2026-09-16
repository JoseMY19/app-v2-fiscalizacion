import { useEffect, useState } from 'react';
import logoDark from '../assets/logo-sjl.webp';

interface Props {
  pendientes?: number;
  sincronizando?: boolean;
  onSincronizar?: () => void;
  fiscalizadorDni?: string | null;
}

function formatearInspector(id?: string | null): string {
  if (!id) return 'Campo';
  if (id.includes('-') || id.length > 12) {
    return `Insp. #${id.slice(0, 6).toUpperCase()}`;
  }
  return `DNI ${id}`;
}

export default function AppHeader({
  pendientes = 0,
  sincronizando = false,
  onSincronizar,
  fiscalizadorDni,
}: Props) {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="header-bar">
      <div className="header-content">
        <div className="header-brand">
          <img
            src={logoDark}
            alt="San Juan de Lurigancho"
            className="header-logo-img"
          />
          <span className="header-badge-tag">Fiscalización</span>
        </div>

        <div className="header-status-group">
          {fiscalizadorDni && (
            <span className="header-inspector-chip" title={fiscalizadorDni}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{formatearInspector(fiscalizadorDni)}</span>
            </span>
          )}

          <span
            className={`status-pill ${online ? 'status-pill--online' : 'status-pill--offline'}`}
            title={online ? 'Conexión activa' : 'Sin conexión (Modo offline)'}
          >
            <span className="status-dot" />
            {online ? 'Online' : 'Offline'}
          </span>

          {onSincronizar && (
            <button
              type="button"
              className={`btn-sync-compact ${pendientes > 0 ? 'btn-sync-compact--alert' : ''}`}
              onClick={onSincronizar}
              disabled={sincronizando}
              title="Sincronizar datos con el servidor central"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{
                  animation: sincronizando ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{sincronizando ? '…' : pendientes > 0 ? `${pendientes}` : 'Sync'}</span>
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
