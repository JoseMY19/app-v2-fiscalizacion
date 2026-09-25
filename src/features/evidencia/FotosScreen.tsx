import { useEffect, useState } from 'react';
import { agregarFoto, eliminarFoto, FOTOS_MAXIMO, FOTOS_MINIMO, listarFotos } from './fotos.repository';
import type { FotoLocal } from '../../lib/db';

/**
 * HU-17 — Adjuntar fotografías. Mínimo 1 obligatoria, hasta 10. Cámara
 * directa o galería (dos inputs: uno con capture="environment", otro sin
 * capture). Comprime siempre antes de guardar (HT-03) — nunca se sube el
 * archivo original al estado ni a Dexie.
 */

import WizardHeader from '../../components/WizardHeader';
import { actionsFooter, alerta, appContainer, badge, btn, card, formHint, photoGrid, photoItem, photoItemImg, photoItemRemove } from '../../lib/ui';
import { cn } from '../../lib/cn';

interface Props {
  localId: string;
  onContinuar: () => void;
  onVolver: () => void;
}

export default function FotosScreen({ localId, onContinuar, onVolver }: Props) {
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    const lista = await listarFotos(localId);
    setFotos(lista);
  }

  useEffect(() => {
    recargar();
  }, [localId]);

  useEffect(() => {
    const urls: Record<number, string> = {};
    for (const foto of fotos) {
      if (foto.id !== undefined) urls[foto.id] = URL.createObjectURL(foto.blob);
    }
    setPreviews(urls);
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [fotos]);

  async function handleArchivos(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setProcesando(true);
    setError(null);
    try {
      for (const archivo of Array.from(archivos)) {
        await agregarFoto(localId, archivo);
      }
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar la foto.');
    } finally {
      setProcesando(false);
    }
  }

  async function handleEliminar(id?: number) {
    await eliminarFoto(id);
    await recargar();
  }

  const puedeContinuar = fotos.length >= FOTOS_MINIMO;
  const alcanzoMaximo = fotos.length >= FOTOS_MAXIMO;

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={7}
        totalPasos={8}
        titulo="Evidencia Fotográfica"
        subtitulo="Captura visual del estado, infracción o diligencia en campo"
        onVolver={onVolver}
        deshabilitarVolver={procesando}
      />

      <div className={card()}>
        <div className="flex items-center justify-between mb-[1rem]">
          <span className="font-semibold text-[0.9375rem] text-primary-900">
            Fotografías adjuntas
          </span>
          <span className={badge(puedeContinuar ? 'success' : 'warning')}>
            {fotos.length} de {FOTOS_MAXIMO} (mínimo {FOTOS_MINIMO})
          </span>
        </div>

        {!alcanzoMaximo && (
          <div className="grid grid-cols-[1fr_1fr] gap-[0.75rem] mb-[1rem]">
            <label
              className={cn(
                btn('outline'),
                'flex! flex-col! items-center! justify-center! py-4! px-2! h-auto! text-center! bg-primary-50!',
                procesando ? 'cursor-not-allowed!' : 'cursor-pointer!',
              )}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleArchivos(e.target.files)}
                disabled={procesando} className="hidden"
              />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-[0.25rem]">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className="font-semibold text-[0.875rem]">Tomar Foto</span>
              <span className="text-[0.6875rem] text-text-muted">Cámara trasera</span>
            </label>

            <label
              className={cn(
                btn('secondary'),
                'flex! flex-col! items-center! justify-center! py-4! px-2! h-auto! text-center!',
                procesando ? 'cursor-not-allowed!' : 'cursor-pointer!',
              )}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleArchivos(e.target.files)}
                disabled={procesando} className="hidden"
              />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-[0.25rem]">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="font-semibold text-[0.875rem]">Galería</span>
              <span className="text-[0.6875rem] text-text-muted">Subir imágenes</span>
            </label>
          </div>
        )}

        {procesando && (
          <div className={alerta('info')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Optimizando y comprimiendo imagen…</span>
          </div>
        )}

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

        {fotos.length === 0 ? (
          <p className="text-[0.875rem] text-text-muted text-center py-[1rem] px-0 mb-0">
            Aún no has adjuntado fotografías. Se requiere al menos 1 fotografía del hecho.
          </p>
        ) : (
          <div className={photoGrid}>
            {fotos.map((foto) => (
              <div key={foto.id} className={photoItem}>
                {foto.id !== undefined && previews[foto.id] && (
                  <img src={previews[foto.id]} alt="Evidencia capturada" className={photoItemImg} />
                )}
                <button
                  type="button"
                  className={photoItemRemove}
                  onClick={() => handleEliminar(foto.id)}
                  title="Eliminar fotografía"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={actionsFooter}>
        <button
          type="button"
          className={btn('primary', { tamano: 'lg', block: true })}
          onClick={onContinuar}
          disabled={!puedeContinuar}
        >
          <span>Continuar a Firma Digital</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        {!puedeContinuar && (
          <p className={cn(formHint, 'text-center! text-danger!')}>
            Debes capturar al menos {FOTOS_MINIMO} fotografía para continuar.
          </p>
        )}
      </div>
    </div>
  );
}
