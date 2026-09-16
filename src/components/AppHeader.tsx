import { useEffect, useState } from 'react';
import logoSjl from '../assets/logo-sjl.webp';

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
            src={logoSjl}
            alt="Municipalidad de San Juan de Lurigancho"
            className="header-logo-img"
          />
          <div className="header-brand-divider" />
          <div className="header-brand-text">
            <span className="header-app-title">Fiscalización</span>
            <span className="header-app-sub">MDSJL</span>
          </div>
        </div>

        <div className="header-actions">
          {!online ? (
            <div
              className="header-sync-btn header-sync-btn--offline"
              title="Dispositivo sin señal. Las capturas se guardan localmente en el celular."
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
              <span>Sin señal</span>
            </div>
          ) : (
            <button
              type="button"
              className={`header-sync-btn ${sincronizando ? 'header-sync-btn--syncing' : ''} ${pendientes > 0 ? 'header-sync-btn--pending' : ''}`}
              onClick={onSincronizar}
              disabled={sincronizando}
              title={
                sincronizando
                  ? 'Sincronizando con el servidor…'
                  : pendientes > 0
                  ? `${pendientes} intervención(es) pendiente(s). Tocar para sincronizar.`
                  : 'Expedientes al día con el servidor. Tocar para comprobar.'
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className={sincronizando ? 'icon-spin' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>
                {sincronizando
                  ? 'Sincronizando…'
                  : pendientes > 0
                  ? `${pendientes} pend.`
                  : 'Al día'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
