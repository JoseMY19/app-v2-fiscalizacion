import { cn } from '../lib/cn';

interface Props {
  vistaActual: string;
  onCambiarVista: (vista: 'inicio' | 'mis-tramites' | 'perfil') => void;
  onNuevaIntervencion: () => void;
  /** Las correcciones las hace oficina: en lugar de "Observadas", sincronizar a mano. */
  onSincronizar: () => void;
  sincronizando?: boolean;
  pendientesSync?: number;
}

function navItem(activo: boolean): string {
  return cn(
    'group flex flex-col items-center justify-center flex-1 h-full bg-transparent border-none cursor-pointer px-0 gap-1 transition-colors duration-200 active:scale-95',
    activo ? 'text-campo-700' : 'text-text-muted hover:text-campo-600',
  );
}

// Al pasar el cursor: el ícono sube un poco y aparece un halo magenta suave detrás.
const iconWrapper =
  'relative isolate flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5 ' +
  "before:content-[''] before:absolute before:-inset-2 before:rounded-[12px] before:bg-campo-50 before:-z-10 " +
  'before:opacity-0 before:scale-75 before:transition-[opacity,transform] before:duration-200 group-hover:before:opacity-100 group-hover:before:scale-100';
const navLabel = 'text-[0.6875rem] font-semibold tracking-[0.01em] leading-none';
// Rayita bajo el ícono de la pestaña activa.
const indicadorActivo =
  'absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-pill bg-campo-700 animate-[aparecer-indicador_250ms_ease-out]';
const contadorBadge =
  'absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-pill bg-danger text-white text-[0.625rem] font-bold leading-none ' +
  'flex items-center justify-center border-2 border-solid border-white';

export default function BottomNavBar({
  vistaActual,
  onCambiarVista,
  onNuevaIntervencion,
  onSincronizar,
  sincronizando = false,
  pendientesSync = 0,
}: Props) {
  const fabActivo = vistaActual === 'nueva-intervencion';

  return (
    <nav
      className="fixed bottom-3 left-3 right-3 h-[64px] bg-white rounded-[24px] border border-solid border-black/[0.04] shadow-[0_10px_30px_-8px_rgba(14,26,59,0.22),0_2px_6px_rgba(14,26,59,0.06)] flex items-center justify-around px-1.5 z-50 max-w-[456px] mx-auto translate-z-0"
      aria-label="Navegación principal"
    >
      {/* 1. Inicio */}
      <button type="button" className={navItem(vistaActual === 'inicio')} onClick={() => onCambiarVista('inicio')}>
        <div className={iconWrapper}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {vistaActual === 'inicio' && <span className={indicadorActivo} />}
        </div>
        <span className={cn(navLabel, 'mt-1.5')}>Inicio</span>
      </button>

      {/* 2. Trámites */}
      <button type="button" className={navItem(vistaActual === 'mis-tramites')} onClick={() => onCambiarVista('mis-tramites')}>
        <div className={iconWrapper}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 12h6M9 16h4" />
          </svg>
          {vistaActual === 'mis-tramites' && <span className={indicadorActivo} />}
        </div>
        <span className={cn(navLabel, 'mt-1.5')}>Trámites</span>
      </button>

      {/* 3. Botón flotante central (+) con su etiqueta */}
      <button
        type="button"
        className="flex flex-col items-center justify-end flex-1 h-full bg-transparent border-none cursor-pointer px-0 pb-2 gap-1 group"
        onClick={onNuevaIntervencion}
        title="Nueva Intervención"
        aria-label="Nueva Intervención"
      >
        <span
          className={cn(
            'w-[54px] h-[54px] -mt-8 rounded-full flex items-center justify-center transition-[transform,box-shadow] duration-200 ease-out translate-z-0',
            'group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-[0_12px_24px_-4px_rgba(101,10,64,0.6)] group-active:scale-[0.92]',
            'bg-linear-135 from-campo-700 to-campo-900 shadow-[0_8px_18px_-4px_rgba(101,10,64,0.55)]',
            fabActivo && 'ring-4 ring-campo-100',
          )}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" className="transition-transform duration-300 ease-out group-hover:rotate-90">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span className={cn(navLabel, 'text-campo-700 font-bold')}>Nuevo</span>
      </button>

      {/* 4. Sincronizar */}
      <button type="button" className={navItem(false)} onClick={onSincronizar} disabled={sincronizando} aria-label="Sincronizar">
        <div className={cn(iconWrapper, sincronizando && 'animate-spin')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16M3 12a9 9 0 0 1 15.36-6.36L21 8" />
            <polyline points="21 3 21 8 16 8" />
            <polyline points="3 21 3 16 8 16" />
          </svg>
          {pendientesSync > 0 && !sincronizando && (
            <span className={contadorBadge}>{pendientesSync > 9 ? '9+' : pendientesSync}</span>
          )}
        </div>
        <span className={cn(navLabel, 'mt-1.5')}>{sincronizando ? 'Enviando…' : 'Sincronizar'}</span>
      </button>

      {/* 5. Perfil */}
      <button type="button" className={navItem(vistaActual === 'perfil')} onClick={() => onCambiarVista('perfil')}>
        <div className={iconWrapper}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {vistaActual === 'perfil' && <span className={indicadorActivo} />}
        </div>
        <span className={cn(navLabel, 'mt-1.5')}>Perfil</span>
      </button>
    </nav>
  );
}
