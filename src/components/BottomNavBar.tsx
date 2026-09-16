interface Props {
  vistaActual: string;
  onCambiarVista: (vista: 'inicio' | 'mis-tramites' | 'observadas' | 'perfil') => void;
  onNuevaIntervencion: () => void;
  tieneObservadas?: boolean;
  pendientesSync?: number;
}

export default function BottomNavBar({
  vistaActual,
  onCambiarVista,
  onNuevaIntervencion,
  tieneObservadas = false,
  pendientesSync = 0,
}: Props) {
  const tieneNotificacionInicio = pendientesSync > 0;

  return (
    <nav className="bottom-nav-bar" aria-label="Navegación principal">
      {/* 1. Inicio */}
      <button
        type="button"
        className={`bottom-nav-item ${vistaActual === 'inicio' ? 'bottom-nav-item--active' : ''}`}
        onClick={() => onCambiarVista('inicio')}
      >
        <div className="bottom-nav-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={vistaActual === 'inicio' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {tieneNotificacionInicio && <span className="bottom-nav-dot" />}
        </div>
        <span className="bottom-nav-label">Inicio</span>
      </button>

      {/* 2. Trámites */}
      <button
        type="button"
        className={`bottom-nav-item ${vistaActual === 'mis-tramites' ? 'bottom-nav-item--active' : ''}`}
        onClick={() => onCambiarVista('mis-tramites')}
      >
        <div className="bottom-nav-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 12h6M9 16h4" />
          </svg>
        </div>
        <span className="bottom-nav-label">Trámites</span>
      </button>

      {/* 3. Botón Flotante Central (+) */}
      <div className="bottom-nav-fab-container">
        <button
          type="button"
          className={`bottom-nav-fab ${vistaActual === 'nueva-intervencion' ? 'bottom-nav-fab--active' : ''}`}
          onClick={onNuevaIntervencion}
          title="Nueva Intervención"
          aria-label="Nueva Intervención"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 4. Observadas */}
      <button
        type="button"
        className={`bottom-nav-item ${vistaActual === 'observadas' ? 'bottom-nav-item--active' : ''}`}
        onClick={() => onCambiarVista('observadas')}
      >
        <div className="bottom-nav-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {tieneObservadas && <span className="bottom-nav-dot bottom-nav-dot--alert" />}
        </div>
        <span className="bottom-nav-label">Observadas</span>
      </button>

      {/* 5. Perfil */}
      <button
        type="button"
        className={`bottom-nav-item ${vistaActual === 'perfil' ? 'bottom-nav-item--active' : ''}`}
        onClick={() => onCambiarVista('perfil')}
      >
        <div className="bottom-nav-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className="bottom-nav-label">Perfil</span>
      </button>
    </nav>
  );
}
