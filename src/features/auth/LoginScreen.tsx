import { useState } from 'react';
import { login } from './auth.repository';
import logoDark from '../../assets/logo-sjl.webp';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
        backgroundColor: 'var(--color-bg-app)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Esquinas decorativas oficiales MDSJL */}
      <div className="bg-decorations-wrapper">
        <div className="bg-corner-top" />
        <div className="bg-corner-bottom" />
      </div>

      <div style={{ width: '100%', maxWidth: 390, position: 'relative', zIndex: 1 }}>
        {/* Cabecera institucional con Logo Oficial */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src={logoDark}
            alt="San Juan de Lurigancho"
            style={{
              maxHeight: 52,
              width: 'auto',
              maxWidth: '85%',
              margin: '0 auto 0.875rem auto',
              display: 'block',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))',
            }}
          />
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: 'var(--color-primary-900)', fontWeight: 800 }}>
            Fiscalización en Campo
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 0 }}>
            Subgerencia de Operaciones de Fiscalización
          </p>
        </div>

        {/* Tarjeta de Login */}
        <div className="card" style={{ padding: '1.75rem', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label form-label-required">DNI del fiscalizador</label>
              <input
                type="text"
                className="form-input"
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

            <div className="form-group">
              <label className="form-label form-label-required">Contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="current-password"
                required
              />
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
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: '0.75rem' }}
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
                    strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>Ingresando…</span>
                </>
              ) : (
                <span>Ingresar al sistema</span>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '1rem' }}>
          Sistema de Apoyo a la Fiscalización (PAS SJL)
        </p>
      </div>
    </div>
  );
}
