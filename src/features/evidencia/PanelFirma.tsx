import { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { actionsRow, btn, signatureBox, signatureCanvas } from '../../lib/ui';

/**
 * HU-18: panel de firma táctil para el propio dispositivo del
 * fiscalizador. signature_pad decidido explícitamente en la sesión de
 * implementación (suaviza trazos, maneja mouse/touch/pen de forma
 * uniforme — relevante por el riesgo conocido de Safari iOS, ver HT-05).
 */
interface Props {
  onFirmar: (blob: Blob) => void;
}

export default function PanelFirma({ onFirmar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Recomendación del propio signature_pad: ajustar al devicePixelRatio
    // para que el trazo no salga borroso en pantallas retina/celulares.
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    const pad = new SignaturePad(canvas);
    pad.addEventListener('endStroke', () => setVacio(pad.isEmpty()));
    padRef.current = pad;

    return () => pad.off();
  }, []);

  function limpiar() {
    padRef.current?.clear();
    setVacio(true);
  }

  async function confirmar() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    const dataUrl = pad.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    onFirmar(blob);
  }

  return (
    <div className={signatureBox}>
      <div className="relative mb-[0.75rem]">
        <canvas
          ref={canvasRef}
          className={signatureCanvas}
        />
        {vacio && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-text-light text-[0.875rem]">
            Firme aquí con el dedo o lápiz óptico
          </div>
        )}
      </div>

      <div className={actionsRow}>
        <button
          type="button"
          className={btn('secondary')}
          onClick={limpiar}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>Limpiar</span>
        </button>

        <button
          type="button"
          className={btn('primary')}
          onClick={confirmar}
          disabled={vacio}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Confirmar firma</span>
        </button>
      </div>
    </div>
  );
}
