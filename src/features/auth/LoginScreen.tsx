import { useState } from 'react';
import { login, obtenerDniRecordado, recordarDni } from './auth.repository';
import CambiarContrasenaScreen from './CambiarContrasenaScreen';
import logoSjl from '../../assets/logo-sjl.webp';
import { cn } from '../../lib/cn';
import { alerta, campoRelleno, campoRellenoEtiqueta, campoRellenoIcono, campoRellenoInput } from '../../lib/ui';
import BotonInstalarApp from '../../components/BotonInstalarApp';

const manchaFondo = 'absolute rounded-full blur-3xl';

/**
 * HU-28 — reemplaza a SeleccionarFiscalizadorScreen ("¿Quién eres?", HU-24).
 * Requiere red la primera vez (no hay sesión que restaurar todavía); una
 * vez logueado, la sesión sobrevive estar offline — ver App.tsx.
 * Tras login, si debeCambiarContrasena es true, muestra la pantalla de cambio.
 */
interface Props {
  onListo: () => void;
}

export default function LoginScreen({ onListo }: Props) {
  const [dni, setDni] = useState(() => obtenerDniRecordado());
  const [recordar, setRecordar] = useState(() => obtenerDniRecordado() !== '');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debeCambiar, setDebeCambiar] = useState(false);

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const usuario = await login(dni.trim(), contrasena);
      recordarDni(recordar ? dni.trim() : null);
      if (usuario.debeCambiarContrasena) {
        setDebeCambiar(true);
      } else {
        onListo();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión. Revisa tu conexión.');
    } finally {
      setEnviando(false);
    }
  }

  if (debeCambiar) {
    return <CambiarContrasenaScreen onListo={onListo} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 pt-10 pb-8 bg-bg-app relative overflow-hidden">
      {/* Franja institucional multicolor SJL */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-franja-sjl z-[2]" aria-hidden="true" />

      {/* Fondos difusos con la paleta SJL */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className={cn(manchaFondo, 'w-72 h-72 -left-24 top-1/3 bg-sjl-celeste/20')} />
        <div className={cn(manchaFondo, 'w-80 h-80 -left-20 -bottom-24 bg-sjl-rosa/20')} />
        <div className={cn(manchaFondo, 'w-80 h-80 -right-24 -bottom-16 bg-sjl-amarillo/25')} />
        <div className={cn(manchaFondo, 'w-56 h-56 -right-20 top-10 bg-sjl-verde/15')} />
      </div>

      <div className="w-full max-w-[390px] relative z-[1]">
        {/* Cabecera: logo municipal, ícono y nombre del sistema */}
        <div className="text-center mb-6">
          <img
            src={logoSjl}
            alt="Municipalidad de San Juan de Lurigancho"
            className="max-h-[84px] w-auto max-w-[90%] mx-auto mb-6 block"
          />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-1.5 rounded-pill bg-white/70 border border-solid border-border shadow-xs">
            <span className="w-2 h-2 rounded-full bg-franja-sjl" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary-800">Fiscalización en Campo</span>
          </div>
          <p className="text-xs font-medium text-text-muted mb-4">Subgerencia de Operaciones de Fiscalización</p>

          <h1 className="font-display text-[3.5rem] font-bold leading-none tracking-[0.02em] mb-2">
            <span className="text-sjl-rojo">P</span>
            <span className="text-sjl-naranja">A</span>
            <span className="text-sjl-celeste">S</span>
          </h1>
          <p className="text-sm text-text-muted mb-0">Procedimiento Administrativo Sancionador</p>
        </div>

        {/* Tarjeta de login */}
        <div className="bg-white/90 backdrop-blur-sm border border-solid border-border rounded-xl px-5 pt-6 pb-5 shadow-[0_10px_30px_-5px_rgba(16,42,113,0.1),0_4px_12px_-2px_rgba(16,42,113,0.05)]">
          <div className="text-center mb-5">
            <h2 className="text-[1.25rem] font-bold text-text-title mb-1">Iniciar sesión</h2>
            <p className="text-[0.8125rem] text-text-muted mb-0">Ingresa tus credenciales asignadas</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className={cn(campoRelleno, 'mb-3')} htmlFor="login-dni">
              <span className={campoRellenoIcono}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="2" />
                  <line x1="15" y1="8" x2="17" y2="8" />
                  <line x1="15" y1="12" x2="17" y2="12" />
                  <line x1="7" y1="16" x2="17" y2="16" />
                </svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className={campoRellenoEtiqueta}>DNI</span>
                <input
                  id="login-dni"
                  type="text"
                  className={campoRellenoInput}
                  placeholder="Ej. 45678901"
                  maxLength={8}
                  inputMode="numeric"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  autoComplete="username"
                  required
                  autoFocus={!dni}
                />
              </span>
            </label>

            <label className={campoRelleno} htmlFor="login-password">
              <span className={campoRellenoIcono}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className={campoRellenoEtiqueta}>Contraseña</span>
                <input
                  id="login-password"
                  type={mostrarContrasena ? 'text' : 'password'}
                  className={campoRellenoInput}
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  autoComplete="current-password"
                  required
                  autoFocus={!!dni}
                />
              </span>
              <button
                type="button"
                className="bg-transparent border-none text-text-muted cursor-pointer p-1.5 flex items-center justify-center rounded-sm transition-colors duration-150 hover:text-primary-600"
                onClick={() => setMostrarContrasena(!mostrarContrasena)}
                aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
                tabIndex={-1}
              >
                {mostrarContrasena ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </label>

            <label className="flex items-center justify-center gap-2.5 my-5 text-sm text-text-body cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-[18px] h-[18px] accent-primary-800 cursor-pointer"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
              />
              <span>Recordar mi DNI</span>
            </label>

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
              className={cn(
                'relative overflow-hidden w-full min-h-[52px] inline-flex items-center justify-center gap-2.5 rounded-pill border-none cursor-pointer',
                'bg-primary-800 text-white text-base font-bold shadow-[0_8px_20px_-6px_rgba(16,31,77,0.45)]',
                'transition-[background-color,transform,opacity] duration-150 not-disabled:hover:bg-primary-700 not-disabled:active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none',
              )}
              disabled={enviando || !dni.trim() || !contrasena}
            >
              {enviando ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="animate-spin">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Validando credenciales…</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                  <span>Ingresar</span>
                </>
              )}
              <span className="absolute left-0 right-0 bottom-0 h-1 bg-franja-sjl" aria-hidden="true" />
            </button>
          </form>

          <BotonInstalarApp className="mt-4" />
        </div>
      </div>
    </div>
  );
}
