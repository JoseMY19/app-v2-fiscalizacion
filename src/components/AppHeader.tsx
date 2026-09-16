import { useEffect, useState } from 'react';

interface Props {
  pendientes?: number;
  sincronizando?: boolean;
  onSincronizar?: () => void;
  fiscalizadorDni?: string | null;
}

export default function AppHeader({}: Props) {
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
          <div className="header-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="header-app-name">Fiscalización SJL</h1>
            <p className="header-app-sub">MDSJL · Operaciones</p>
          </div>
        </div>

        <div className="header-status-group">
          <span className={`status-pill ${online ? 'status-pill--online' : 'status-pill--offline'}`}>
            <span className="status-dot" />
            <span>{online ? 'En línea' : 'Sin señal'}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
