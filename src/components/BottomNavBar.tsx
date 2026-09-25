import { cn } from '../lib/cn';

interface Props {
  vistaActual: string;
  onCambiarVista: (vista: 'inicio' | 'mis-tramites' | 'observadas' | 'perfil') => void;
  onNuevaIntervencion: () => void;
  tieneObservadas?: boolean;
  pendientesSync?: number;
}

function navItem(activo: boolean): string {
  return cn(
    'flex flex-col items-center justify-center flex-1 bg-transparent border-none cursor-pointer py-[0.35rem] px-0 gap-[0.2rem] transition-colors duration-150 active:scale-95',
    activo ? 'text-primary-600' : 'text-text-muted',
  );
}

const iconWrapper = 'relative flex items-center justify-center';
const navLabel = 'text-[0.6875rem] font-semibold tracking-[0.01em]';
const navDot = 'absolute -top-0.5 -right-[3px] w-[7px] h-[7px] rounded-full border-[1.5px] border-solid border-white';

export default function BottomNavBar({
  vistaActual,
  onCambiarVista,
  onNuevaIntervencion,
  tieneObservadas = false,
  pendientesSync = 0,
}: Props) {
  const tieneNotificacionInicio = pendientesSync > 0;
  const fabActivo = vistaActual === 'nueva-intervencion';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-[62px] bg-white border-t border-solid border-border shadow-[0_-2px_10px_rgba(14,26,59,0.08)] flex items-center justify-around px-2 z-50 max-w-[480px] mx-auto translate-z-0"
      aria-label="Navegación principal"
    >
      {/* 1. Inicio */}
      <button type="button" className={navItem(vistaActual === 'inicio')} onClick={() => onCambiarVista('inicio')}>
        <div className={iconWrapper}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={vistaActual === 'inicio' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {tieneNotificacionInicio && <span className={cn(navDot, 'bg-[#ec4899]')} />}
        </div>
        <span className={navLabel}>Inicio</span>
      </button>

      {/* 2. Trámites */}
      <button type="button" className={navItem(vistaActual === 'mis-tramites')} onClick={() => onCambiarVista('mis-tramites')}>
        <div className={iconWrapper}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 12h6M9 16h4" />
          </svg>
        </div>
        <span className={navLabel}>Trámites</span>
      </button>

      {/* 3. Botón Flotante Central (+) */}
      <div className="flex items-center justify-center flex-1 relative">
        <button
          type="button"
          className={cn(
            'w-[52px] h-[52px] rounded-full border-[3.5px] border-solid border-white flex items-center justify-center cursor-pointer -mt-6 transition-[transform,box-shadow] duration-150 translate-z-0 active:scale-[0.92] active:shadow-[0_2px_8px_rgba(29,58,143,0.3)]',
            fabActivo
              ? 'bg-linear-135 from-primary-800 to-primary-600 shadow-[0_0_0_3.5px_rgba(29,58,143,0.25),0_6px_18px_rgba(29,58,143,0.45)]'
              : 'bg-linear-135 from-primary-700 to-primary-500 shadow-[0_4px_14px_rgba(29,58,143,0.4)]',
          )}
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
      <button type="button" className={navItem(vistaActual === 'observadas')} onClick={() => onCambiarVista('observadas')}>
        <div className={iconWrapper}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {tieneObservadas && <span className={cn(navDot, 'bg-warning')} />}
        </div>
        <span className={navLabel}>Observadas</span>
      </button>

      {/* 5. Perfil */}
      <button type="button" className={navItem(vistaActual === 'perfil')} onClick={() => onCambiarVista('perfil')}>
        <div className={iconWrapper}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className={navLabel}>Perfil</span>
      </button>
    </nav>
  );
}
