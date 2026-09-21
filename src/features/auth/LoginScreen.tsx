import { useState } from 'react';
import { login } from './auth.repository';
import logoDark from '../../assets/logo-sjl.webp';
import cornerTop from '../../assets/corner-top.png';
import cornerBottom from '../../assets/corner-bottom.png';

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
    <div className="login-screen">
      {/* Esquinas decorativas oficiales MDSJL visibles al 100% */}
      <div className="login-decorations" aria-hidden="true">
        <img src={cornerTop} alt="" className="login-corner-top" />
        <img src={cornerBottom} alt="" className="login-corner-bottom" />
      </div>

      <div className="login-container">
        {/* Cabecera institucional con Logo Oficial */}
        <div className="login-header">
          <img
            src={logoDark}
            alt="Municipalidad de San Juan de Lurigancho"
            className="login-logo-img"
          />
          <h1 className="login-title">
            Fiscalización en Campo
          </h1>
          <p className="login-subtitle">
            Subgerencia de Operaciones de Fiscalización
          </p>
        </div>

        {/* Tarjeta de Login */}
        <div className="login-card">
          <div className="login-card-header">
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales asignadas</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="login-dni">
                DNI del fiscalizador
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
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
                  className="form-input login-input-with-icon"
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

            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="login-password">
                Contraseña
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={mostrarContrasena ? 'text' : 'password'}
                  className="form-input login-input-with-icon login-input-password"
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
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
              <div className="alert alert-error" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg login-btn-submit"
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
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
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

          <div className="login-security-notice">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Acceso seguro · Exclusivo para personal autorizado</span>
          </div>
        </div>

        <p className="login-footer-text">
          Sistema de Apoyo a la Fiscalización (PAS SJL)
        </p>
      </div>
    </div>
  );
}
