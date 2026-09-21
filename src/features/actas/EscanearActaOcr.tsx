import { useState } from 'react';
import { escanearActaConInternet } from './ocr.repository';
import { escanearActaSinConexion, type DatosOcrActa } from '../../lib/ocr-offline';

/**
 * Botón de escaneo opcional para pre-llenar campos de texto libre desde
 * una foto del acta física ya escrita a mano — NUNCA guarda nada por su
 * cuenta, solo entrega sugerencias al formulario que las pidió (ver
 * ocr.repository.ts y lib/ocr-offline.ts). El fiscalizador sigue teniendo
 * que revisar y guardar como siempre.
 * Con señal intenta primero el modo en la nube (más preciso); si falla o
 * no hay señal, cae al modo local (Tesseract.js, menos preciso).
 */
interface Props {
  tipoActa: string;
  onSugerencias: (datos: DatosOcrActa) => void;
}

type Estado = 'inactivo' | 'leyendo-nube' | 'leyendo-local' | 'error';

export default function EscanearActaOcr({ tipoActa, onSugerencias }: Props) {
  const [estado, setEstado] = useState<Estado>('inactivo');
  const [error, setError] = useState<string | null>(null);
  const [modoUsado, setModoUsado] = useState<'nube' | 'local' | null>(null);

  async function handleArchivo(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    const imagen = archivos[0];
    setError(null);
    setModoUsado(null);

    if (navigator.onLine) {
      setEstado('leyendo-nube');
      try {
        const datos = await escanearActaConInternet(tipoActa, imagen);
        aplicarSiHayDatos(datos, 'nube');
        return;
      } catch {
        // sin bloquear al usuario: cae al modo local en silencio, se avisa igual abajo
      }
    }

    setEstado('leyendo-local');
    try {
      const datos = await escanearActaSinConexion(tipoActa, imagen);
      aplicarSiHayDatos(datos, 'local');
    } catch {
      setEstado('error');
      setError('No se pudo leer la foto. Puedes seguir llenando el formulario a mano.');
    }
  }

  function aplicarSiHayDatos(datos: DatosOcrActa, modo: 'nube' | 'local') {
    if (Object.keys(datos).length === 0) {
      setEstado('error');
      setError('No se reconoció ningún campo en la foto. Llena el formulario a mano.');
      return;
    }
    onSugerencias(datos);
    setModoUsado(modo);
    setEstado('inactivo');
  }

  const leyendo = estado === 'leyendo-nube' || estado === 'leyendo-local';

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        className="btn btn-outline"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: leyendo ? 'not-allowed' : 'pointer' }}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleArchivo(e.target.files)}
          disabled={leyendo}
          style={{ display: 'none' }}
        />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        <span>
          {estado === 'leyendo-nube' && 'Leyendo foto (en línea)…'}
          {estado === 'leyendo-local' && 'Leyendo foto sin conexión (puede tardar)…'}
          {!leyendo && 'Escanear acta física y sugerir campos'}
        </span>
      </label>
      <p className="form-hint" style={{ marginTop: '0.375rem' }}>
        Opcional: toma foto del acta ya llena a mano. Los campos se rellenan como sugerencia — siempre revísalos antes de guardar.
      </p>

      {modoUsado && (
        <div className="alert alert-success" role="status" style={{ marginTop: '0.5rem' }}>
          <span>
            Sugerencias aplicadas ({modoUsado === 'nube' ? 'lectura en línea' : 'lectura sin conexión, revisa con más cuidado'}) — verifica cada campo antes de guardar.
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginTop: '0.5rem' }}>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
