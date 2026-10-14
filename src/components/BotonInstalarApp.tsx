import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { estaInstalada, instalarApp, puedeInstalar, suscribirInstalacion } from '../lib/pwa-instalacion';
import { btn, formHint } from '../lib/ui';

/**
 * Botón "Instalar app" para Android con Chrome. Solo aparece cuando el navegador
 * ofreció la instalación y la app todavía no está instalada.
 */
interface Props {
  className?: string;
}

export default function BotonInstalarApp({ className }: Props) {
  const [disponible, setDisponible] = useState(() => puedeInstalar());

  useEffect(() => {
    // Sincroniza por si el evento llegó antes de montar el componente
    setDisponible(puedeInstalar());
    return suscribirInstalacion(() => setDisponible(puedeInstalar()));
  }, []);

  if (!disponible || estaInstalada()) return null;

  return (
    <div className={cn('text-center', className)}>
      <button type="button" className={btn('outline', { tamano: 'md', block: true })} onClick={() => void instalarApp()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Instalar app en este celular</span>
      </button>
      <p className={cn(formHint, 'text-center')}>
        Instálala una vez con internet; luego funciona sin conexión desde el ícono.
      </p>
    </div>
  );
}
