import { useState } from 'react';
import { login } from './auth.repository';
import logoDark from '../../assets/logo-sjl.webp';
import cornerTop from '../../assets/corner-top.png';
import cornerBottom from '../../assets/corner-bottom.png';
import { cn } from '../../lib/cn';
import { alerta, btn, formGroup, formInput, formLabel, formLabelRequired } from '../../lib/ui';

const inputIcon =
  'absolute left-3.5 text-text-light pointer-events-none flex items-center justify-center transition-colors duration-150 group-focus-within:text-primary-600';
const loginCorner = 'absolute w-[145px] h-[145px] min-[480px]:w-[180px] min-[480px]:h-[180px] object-contain select-none pointer-events-none opacity-95';

/**
 * HU-28 — reemplaza a SeleccionarFiscalizadorScreen ("¿Quién eres?", HU-24).
 * Requiere red la primera vez (no hay sesión que restaurar todavía); una
 * vez logueado, la sesión sobrevive estar offline — ver App.tsx.
 */
interface Props {
  onListo: () => void;
}

export default function LoginScreen({ onListo }: Props) {
  const [dni, setDni] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await login(dni.trim(), contrasena);
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión. Revisa tu conexión.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8 bg-bg-app relative overflow-hidden">
      {/* Esquinas decorativas oficiales MDSJL visibles al 100% */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <img src={cornerTop} alt="" className={cn(loginCorner, 'top-0 left-0 object-top-left')} />
        <img src={cornerBottom} alt="" className={cn(loginCorner, 'bottom-0 right-0 object-bottom-right')} />
      </div>

      <div className="w-full max-w-[390px] relative z-[1]">
        {/* Cabecera institucional con Logo Oficial */}
        <div className="text-center mb-6">
          <img
            src={logoDark}
            alt="Municipalidad de San Juan de Lurigancho"
            className="max-h-[54px] w-auto max-w-[85%] mx-auto mb-3.5 block drop-shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
          />
          <h1 className="text-[1.3125rem] font-extrabold text-primary-900 mb-1 tracking-[-0.02em]">
            Fiscalización en Campo
          </h1>
          <p className="text-[0.8125rem] text-text-muted mb-0 font-medium">
            Subgerencia de Operaciones de Fiscalización
          </p>
        </div>

        {/* Tarjeta de Login */}
        <div className="bg-white border border-solid border-border rounded-xl p-7 shadow-[0_10px_30px_-5px_rgba(16,42,113,0.1),0_4px_12px_-2px_rgba(16,42,113,0.05)] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-[linear-gradient(90deg,#102a71_0%,#1d3a8f_50%,#2851b3_100%)]">
          <div className="text-center mb-6">
            <h2 className="text-[1.1875rem] font-bold text-text-title mb-1">Iniciar sesión</h2>
            <p className="text-[0.8125rem] text-text-muted mb-0">Ingresa tus credenciales asignadas</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={formGroup}>
              <label className={cn(formLabel, formLabelRequired)} htmlFor="login-dni">
                DNI del fiscalizador
              </label>
              <div className="group relative flex items-center">
                <span className={inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="9" cy="10" r="2" />
                    <line x1="15" y1="8" x2="17" y2="8" />
                    <line x1="15" y1="12" x2="17" y2="12" />
                    <line x1="7" y1="16" x2="17" y2="16" />
                  </svg>
                </span>
                <input
                  id="login-dni"
                  type="text"
                  className={cn(formInput, 'pl-10')}
                  placeholder="Ej. 45678901"
                  maxLength={8}
                  inputMode="numeric"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className={formGroup}>
              <label className={cn(formLabel, formLabelRequired)} htmlFor="login-password">
                Contraseña
              </label>
              <div className="group relative flex items-center">
                <span className={inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={mostrarContrasena ? 'text' : 'password'}
                  className={cn(formInput, 'pl-10 pr-[2.625rem]')}
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 bg-transparent border-none text-text-muted cursor-pointer p-1 flex items-center justify-center rounded-sm transition-colors duration-150 hover:text-primary-600"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {mostrarContrasena ? (
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
              disabled={enviando || !dni.trim() || !contrasena}
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
                    className="animate-spin">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Validando credenciales…</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                  </svg>
                  <span>Ingresar al sistema</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-[0.35rem] text-[0.7rem] text-text-muted mt-5 pt-4 border-t border-solid border-border">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Acceso seguro · Exclusivo para personal autorizado</span>
          </div>
        </div>

        <p className="text-center text-xs text-text-light mt-5">
          Sistema de Apoyo a la Fiscalización (PAS SJL)
        </p>
      </div>
    </div>
  );
}
