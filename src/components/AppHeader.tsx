import { useEffect, useState } from 'react';
import logoSjl from '../assets/logo-sjl.webp';
import { cn } from '../lib/cn';

interface Props {
  pendientes?: number;
  sincronizando?: boolean;
  onSincronizar?: () => void;
  fiscalizadorDni?: string | null;
}

const syncBtnBase =
  'inline-flex items-center gap-[0.35rem] px-2.5 py-[0.3rem] rounded-pill text-xs font-semibold border border-solid transition-all duration-150 whitespace-nowrap';
const syncBtnHover =
  'cursor-pointer not-disabled:hover:bg-primary-50 not-disabled:hover:border-primary-300 not-disabled:hover:text-primary-700 not-disabled:active:scale-[0.96]';

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

  // Pendientes tenía precedencia sobre "sincronizando" en el CSS original.
  const estadoSync =
    pendientes > 0
      ? 'bg-warning-bg border-warning-border text-warning'
      : sincronizando
      ? 'bg-primary-50 border-primary-200 text-primary-700'
      : 'bg-bg-subtle border-border text-text-body';

  return (
    <header className="bg-white border-b border-solid border-border shadow-[0_1px_3px_0_rgba(14,26,59,0.05)] fixed top-0 left-0 right-0 h-[58px] z-40 max-w-[480px] mx-auto px-4 flex items-center">
      <div className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={logoSjl}
            alt="Municipalidad de San Juan de Lurigancho"
            className="h-[42px] w-auto max-w-[140px] object-contain shrink-0 block"
          />
          <div className="w-px h-6 bg-border shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[0.9375rem] font-extrabold text-text-title tracking-[-0.01em] leading-[1.15] m-0 whitespace-nowrap">Fiscalización</span>
            <span className="text-[0.6875rem] text-text-muted font-semibold m-0 whitespace-nowrap">MDSJL</span>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          {!online ? (
            <div
              className={cn(syncBtnBase, 'bg-danger-bg border-danger-border text-danger cursor-default')}
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
              className={cn(syncBtnBase, syncBtnHover, estadoSync)}
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
                className={sincronizando ? 'animate-spin' : ''}
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
