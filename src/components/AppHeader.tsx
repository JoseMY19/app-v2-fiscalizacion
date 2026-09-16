import { useEffect, useState } from 'react';
import logoDark from '../assets/logo-sjl.webp';

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
          <img
            src={logoDark}
            alt="Municipalidad de San Juan de Lurigancho"
            className="header-logo-img"
          />
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
