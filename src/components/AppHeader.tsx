import { useEffect, useState } from 'react';
import logoWhite from '../assets/logo-sjl-white.webp';

interface Props {
  pendientes?: number;
  sincronizando?: boolean;
  onSincronizar?: () => void;
  fiscalizadorDni?: string | null;
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
            src={logoWhite}
            alt="San Juan de Lurigancho"
            style={{
              height: 28,
              width: 'auto',
              maxHeight: 32,
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <div className="header-titles" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '0.625rem', marginLeft: '0.25rem' }}>
            <span className="header-title" style={{ fontSize: '0.8125rem' }}>Fiscalización</span>
            <span className="header-subtitle" style={{ fontSize: '0.65rem' }}>
              {fiscalizadorDni ? `Insp. ${fiscalizadorDni}` : 'Campo'}
            </span>
          </div>
        </div>

        <div className="header-status-group">
          <span
            className={`badge ${online ? 'badge-success' : 'badge-neutral'}`}
            title={online ? 'Conexión activa' : 'Sin conexión (Modo offline)'}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: online ? 'var(--color-success)' : 'var(--color-text-light)',
                display: 'inline-block',
                marginRight: 4,
              }}
            />
            {online ? 'Online' : 'Offline'}
          </span>

          {onSincronizar && (
            <button
              type="button"
              className={`btn btn-sm ${pendientes > 0 ? 'btn-primary' : 'btn-outline'}`}
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                minHeight: '28px',
                borderColor: pendientes > 0 ? '#ffffff' : 'rgba(255,255,255,0.3)',
                color: pendientes > 0 ? 'var(--color-primary-800)' : '#ffffff',
                backgroundColor: pendientes > 0 ? '#ffffff' : 'rgba(255,255,255,0.12)',
                fontWeight: pendientes > 0 ? 700 : 500,
              }}
              onClick={onSincronizar}
              disabled={sincronizando}
              title="Sincronizar intervenciones con el servidor"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  animation: sincronizando ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              {sincronizando ? 'Sync…' : pendientes > 0 ? `${pendientes} pend.` : 'Sync'}
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
