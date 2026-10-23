import type { ReactNode } from 'react';
import type { UsuarioSesion } from '../auth/auth.repository';
import { cn } from '../../lib/cn';
import { iniciales } from '../../lib/iniciales';
import { appContainer, brilloHero, chipHero, iconoTarjeta, tarjetaHero, tarjetaSuave } from '../../lib/ui';

/**
 * Perfil del fiscalizador: quién está logueado en este celular y salida de
 * la sesión. Los datos salen de la sesión guardada (login), no de la red,
 * así que la pantalla funciona offline.
 */
interface Props {
  usuario: UsuarioSesion | null;
  /** Intervenciones aún no enviadas: si hay, se pide confirmar antes de cerrar sesión. */
  pendientes: number;
  onCerrarSesion: () => void;
}

const seccionTitulo = 'text-[0.725rem] font-bold uppercase tracking-[0.06em] text-text-muted px-1 mb-2';
const fila = 'flex items-center gap-3.5 px-4 py-3 border-0 border-b border-solid border-border last:border-b-0';
const filaEtiqueta = 'text-xs text-text-muted leading-tight';
const filaValor = 'text-[0.9375rem] font-semibold text-text-title leading-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis';

function FilaDato({ icono, etiqueta, valor }: { icono: ReactNode; etiqueta: string; valor: ReactNode }) {
  return (
    <div className={fila}>
      <div className={cn(iconoTarjeta, 'w-10 h-10 bg-campo-50 text-campo-700')}>{icono}</div>
      <div className="flex-1 min-w-0">
        <div className={filaEtiqueta}>{etiqueta}</div>
        <div className={filaValor}>{valor}</div>
      </div>
    </div>
  );
}

export default function PerfilScreen({ usuario, pendientes, onCerrarSesion }: Props) {
  const nombre = usuario?.nombres?.trim() || 'Fiscalizador de Campo';
  const rol = usuario?.rolNombre || 'Fiscalizador de Campo';

  function handleCerrarSesion() {
    if (
      pendientes > 0 &&
      !window.confirm(
        `Tienes ${pendientes} intervención(es) sin enviar. Si cierras sesión no se sincronizarán hasta que vuelvas a ingresar. ¿Cerrar sesión de todos modos?`,
      )
    ) {
      return;
    }
    onCerrarSesion();
  }

  return (
    <div className={appContainer}>
      {/* Tarjeta de identidad */}
      <div className={cn(tarjetaHero, 'px-5 pt-6 pb-7 mb-5 text-center')}>
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
          <div className={cn(brilloHero, '-top-12 -right-10 w-44 h-44 bg-sjl-amarillo/40')} />
          <div className={cn(brilloHero, '-bottom-16 -left-10 w-48 h-44 bg-sjl-celeste/35')} />
        </div>

        <div className="w-20 h-20 mx-auto mb-3.5 rounded-full p-[3px] bg-franja-sjl shadow-lg">
          <div className="w-full h-full rounded-full bg-campo-800 flex items-center justify-center font-titulo text-[1.625rem] font-black text-white">
            {usuario?.nombres ? (
              iniciales(usuario.nombres)
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
        </div>

        <h1 className="font-titulo text-[1.5rem] font-black text-white leading-tight mb-1">{nombre}</h1>
        <p className="text-[0.8125rem] text-white/80 mb-3.5">{rol}</p>

        <span className={chipHero}>
          <span className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_0_3px_rgba(74,222,128,0.25)]" aria-hidden="true" />
          <span>Activo en campo</span>
        </span>

        <div className="absolute left-0 right-0 bottom-0 h-1.5 bg-franja-sjl" aria-hidden="true" />
      </div>

      {/* Datos */}
      <div className={seccionTitulo}>Mis datos</div>
      <div className={cn(tarjetaSuave, 'overflow-hidden mb-5')}>
        <FilaDato
          etiqueta="DNI"
          valor={usuario?.dni || 'Sin registrar'}
          icono={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <line x1="15" y1="8" x2="17" y2="8" />
              <line x1="15" y1="12" x2="17" y2="12" />
              <line x1="7" y1="16" x2="17" y2="16" />
            </svg>
          }
        />
        <FilaDato
          etiqueta="Área"
          valor="Subgerencia de Operaciones de Fiscalización"
          icono={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
            </svg>
          }
        />
        <FilaDato
          etiqueta="Jurisdicción"
          valor="San Juan de Lurigancho"
          icono={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
        />
        <FilaDato
          etiqueta="Estado"
          valor={<span className="text-success">Activo en campo</span>}
          icono={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>

      {/* Sesión */}
      <div className={seccionTitulo}>Sesión</div>
      <button
        type="button"
        className={cn(
          tarjetaSuave,
          'w-full flex items-center gap-3.5 px-4 py-3.5 text-left cursor-pointer transition-[box-shadow,transform] duration-150',
          'hover:shadow-[0_10px_24px_-6px_rgba(179,38,30,0.2)] active:scale-[0.98]',
        )}
        onClick={handleCerrarSesion}
      >
        <div className={cn(iconoTarjeta, 'bg-danger-bg text-danger')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[0.9375rem] font-bold text-danger leading-tight">Cerrar sesión</div>
          <div className="text-xs text-text-muted mt-0.5">Solo en este dispositivo</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-text-light shrink-0">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <p className="text-center text-[0.6875rem] text-text-light mt-6 mb-0">
        PAS · Fiscalización de Campo · MDSJL
      </p>
    </div>
  );
}
