import { useEffect, useState } from 'react';
import { guardarTestigos, listarTestigos } from './testigos.repository';

/**
 * Cambio de regla de negocio (2026-09-14, pedido explícito, reemplaza el
 * criterio anterior de HU-20 donde los testigos solo se pedían si el
 * administrado se negaba a identificarse/firmar): toda intervención de
 * campo, sin excepción de camino, exige registrar testigos presenciales.
 * Pantalla única y común a los 3 caminos — reemplaza el bloque condicional
 * que antes vivía dentro de NotificacionEntregaScreen (esa pantalla sigue
 * existiendo solo para EXHORTACION/CONSTATACION, que nunca tuvieron acceso
 * a ese bloque).
 * Cambio de regla (2026-09-18): solo el testigo 1 es obligatorio, el
 * testigo 2 pasa a ser opcional — pero si se empieza a llenar, debe
 * completarse entero (no se guarda un testigo a medias).
 */
import WizardHeader from '../../components/WizardHeader';

interface Props {
  localId: string;
  onContinuar: () => void;
  onVolver: () => void;
}

export default function TestigosScreen({ localId, onContinuar, onVolver }: Props) {
  const [testigo1Nombre, setTestigo1Nombre] = useState('');
  const [testigo1Documento, setTestigo1Documento] = useState('');
  const [testigo2Nombre, setTestigo2Nombre] = useState('');
  const [testigo2Documento, setTestigo2Documento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarTestigos(localId).then((testigos) => {
      const t1 = testigos.find((t) => t.orden === 1);
      const t2 = testigos.find((t) => t.orden === 2);
      if (t1) {
        setTestigo1Nombre(t1.nombre);
        setTestigo1Documento(t1.documento);
      }
      if (t2) {
        setTestigo2Nombre(t2.nombre);
        setTestigo2Documento(t2.documento);
      }
    });
  }, [localId]);

  const testigo1Completo = testigo1Nombre.trim().length > 0 && testigo1Documento.trim().length > 0;
  const testigo2Vacio = testigo2Nombre.trim().length === 0 && testigo2Documento.trim().length === 0;
  const testigo2Completo = testigo2Nombre.trim().length > 0 && testigo2Documento.trim().length > 0;
  // Testigo 2 opcional: o se deja completamente vacío, o se llena entero —
  // nunca se guarda a medias.
  const completo = testigo1Completo && (testigo2Vacio || testigo2Completo);

  async function handleGuardar() {
    if (!completo || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const testigos = [{ nombre: testigo1Nombre, documento: testigo1Documento }];
      if (testigo2Completo) {
        testigos.push({ nombre: testigo2Nombre, documento: testigo2Documento });
      }
      await guardarTestigos(localId, testigos);
      onContinuar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar los testigos.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="app-container">
      <WizardHeader
        pasoActual={6}
        totalPasos={8}
        titulo="Testigos de la Intervención"
        subtitulo="Toda intervención requiere al menos 1 testigo presencial"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      <div className="card">
        <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', color: 'var(--color-primary-900)' }}>
          Testigo 1 (Obligatorio)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.625rem', marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label form-label-required">Nombre completo</label>
            <input
              type="text"
              className="form-input"
              value={testigo1Nombre}
              onChange={(e) => setTestigo1Nombre(e.target.value)}
              placeholder="Nombre del testigo"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label form-label-required">DNI</label>
            <input
              type="text"
              className="form-input"
              value={testigo1Documento}
              onChange={(e) => setTestigo1Documento(e.target.value)}
              placeholder="N° DNI"
            />
          </div>
        </div>

        <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.5rem', color: 'var(--color-primary-900)' }}>
          Testigo 2 (Opcional)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.625rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre completo</label>
            <input
              type="text"
              className="form-input"
              value={testigo2Nombre}
              onChange={(e) => setTestigo2Nombre(e.target.value)}
              placeholder="Nombre del testigo"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">DNI</label>
            <input
              type="text"
              className="form-input"
              value={testigo2Documento}
              onChange={(e) => setTestigo2Documento(e.target.value)}
              placeholder="N° DNI"
            />
          </div>
        </div>
        {!testigo2Vacio && !testigo2Completo && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-warning-text)', marginTop: '0.375rem', marginBottom: 0 }}>
            Complete nombre y DNI del testigo 2, o borre ambos campos para dejarlo sin registrar.
          </p>
        )}

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="actions-footer">
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={handleGuardar}
          disabled={!completo || guardando}
        >
          {guardando ? <span>Guardando…</span> : <span>Continuar</span>}
        </button>
      </div>
    </div>
  );
}
