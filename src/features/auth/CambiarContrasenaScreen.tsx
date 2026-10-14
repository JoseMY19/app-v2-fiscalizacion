import { useState } from 'react';
import { cambiarContrasena } from './auth.repository';
import { cn } from '../../lib/cn';
import { alerta, btn, formGroup, formInput, formLabel, formLabelRequired } from '../../lib/ui';

/**
 * Pantalla para cambiar contraseña cuando debeCambiarContrasena es true.
 * Solo funciona con conexión activa. Validación: 8+ caracteres con letra y número.
 */
interface Props {
  onListo: () => void;
  /** Salida de emergencia (sesión vencida o usuario equivocado); solo cuando la pantalla es obligatoria al reabrir la app. */
  onCerrarSesion?: () => void;
}

export default function CambiarContrasenaScreen({ onListo, onCerrarSesion }: Props) {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarContrasenaNueva, setMostrarContrasenaNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esContrasenaNuevaValida = () => {
    if (contrasenaNueva.length < 8) return false;
    return /\p{L}/u.test(contrasenaNueva) && /\d/.test(contrasenaNueva);
  };

  const esFormularioValido = () => {
    return (
      contrasenaActual.trim() &&
      contrasenaNueva.trim() &&
      confirmarContrasena.trim() &&
      contrasenaNueva === confirmarContrasena &&
      esContrasenaNuevaValida()
    );
  };

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    if (!navigator.onLine) {
      setError('Necesitas conexión para cambiar tu contraseña.');
      return;
    }
    setEnviando(true);
    setError(null);

    try {
      await cambiarContrasena(contrasenaActual, contrasenaNueva);
      onListo();
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'Necesitas conexión para cambiar tu contraseña.';
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  const mostrarAdvRnueva = contrasenaNueva && !esContrasenaNuevaValida();

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8 bg-bg-app">
      <div className="w-full max-w-[390px]">
        <div className="bg-white border border-solid border-border rounded-xl p-7 shadow-[0_10px_30px_-5px_rgba(16,42,113,0.1),0_4px_12px_-2px_rgba(16,42,113,0.05)] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-[linear-gradient(90deg,#102a71_0%,#1d3a8f_50%,#2851b3_100%)]">
          <div className="text-center mb-6">
            <h2 className="text-[1.1875rem] font-bold text-text-title mb-1">Cambiar contraseña</h2>
            <p className="text-[0.8125rem] text-text-muted mb-0">
              Por seguridad, necesitas actualizar tu contraseña en el primer acceso
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={formGroup}>
              <label className={cn(formLabel, formLabelRequired)} htmlFor="actual">
                Contraseña actual
              </label>
              <input
                id="actual"
                type="password"
                className={formInput}
                placeholder="••••••••"
                value={contrasenaActual}
                onChange={(e) => setContrasenaActual(e.target.value)}
                autoComplete="current-password"
                required
                autoFocus
              />
            </div>

            <div className={formGroup}>
              <label className={cn(formLabel, formLabelRequired)} htmlFor="nueva">
                Nueva contraseña
              </label>
              <div className="group relative flex items-center">
                <input
                  id="nueva"
                  type={mostrarContrasenaNueva ? 'text' : 'password'}
                  className={cn(formInput, 'pr-[2.625rem]')}
                  placeholder="••••••••"
                  value={contrasenaNueva}
                  onChange={(e) => setContrasenaNueva(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center rounded-sm transition-colors duration-150 hover:text-primary-600"
                  onClick={() => setMostrarContrasenaNueva(!mostrarContrasenaNueva)}
                  aria-label={mostrarContrasenaNueva ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {mostrarContrasenaNueva ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {mostrarAdvRnueva && (
                <p className="text-[0.75rem] text-danger mt-1">
                  Mínimo 8 caracteres con letras y números
                </p>
              )}
            </div>

            <div className={formGroup}>
              <label className={cn(formLabel, formLabelRequired)} htmlFor="confirmar">
                Confirmar contraseña
              </label>
              <div className="group relative flex items-center">
                <input
                  id="confirmar"
                  type={mostrarConfirmar ? 'text' : 'password'}
                  className={cn(formInput, 'pr-[2.625rem]', contrasenaNueva && confirmarContrasena && contrasenaNueva !== confirmarContrasena ? 'border-danger' : '')}
                  placeholder="••••••••"
                  value={confirmarContrasena}
                  onChange={(e) => setConfirmarContrasena(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center rounded-sm transition-colors duration-150 hover:text-primary-600"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  aria-label={mostrarConfirmar ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {mostrarConfirmar ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {contrasenaNueva && confirmarContrasena && contrasenaNueva !== confirmarContrasena && (
                <p className="text-[0.75rem] text-danger mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            {error && (
              <div className={alerta('error')} role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={cn(btn('primary', { tamano: 'lg', block: true }), 'mt-3.5 font-bold shadow-[0_4px_14px_rgba(16,42,113,0.22)] disabled:opacity-55 disabled:shadow-none disabled:bg-primary-300 disabled:border-primary-300 disabled:text-white')}
              disabled={enviando || !esFormularioValido()}
            >
              {enviando ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    className="animate-spin"
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Actualizando…</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                  <span>Actualizar contraseña</span>
                </>
              )}
            </button>
          </form>
          {onCerrarSesion && (
            <button type="button" className={cn(btn('secondary', { tamano: 'md', block: true }), 'mt-3!')} onClick={onCerrarSesion} disabled={enviando}>
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
