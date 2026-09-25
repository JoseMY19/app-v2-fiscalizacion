import { useEffect, useState } from 'react';
import { agregarFoto, eliminarFoto, listarFotosPorActaTipo } from './fotos.repository';
import type { FotoLocal } from '../../lib/db';
import { alerta, badge, btn, card, formHint, photoGrid, photoItem, photoItemImg, photoItemRemove } from '../../lib/ui';
import { cn } from '../../lib/cn';

/**
 * Foto del acta física firmada, adjunta directo en la pantalla del acta
 * correspondiente — no en el paso genérico de evidencia (FotosScreen.tsx).
 * Reemplaza la validez legal de la firma digital del administrado, que
 * nunca se captura en el celular del fiscalizador (BYOD, tercero) — ver
 * comentario en lib/db.ts sobre FirmaLocal.
 */
interface Props {
  intervencionLocalId: string;
  actaTipo: string;
  obligatoria: boolean;
  label?: string;
  onCambio?: (tieneFoto: boolean) => void;
}

export default function AdjuntarFotoActa({ intervencionLocalId, actaTipo, obligatoria, label, onCambio }: Props) {
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    const lista = await listarFotosPorActaTipo(intervencionLocalId, actaTipo);
    setFotos(lista);
    onCambio?.(lista.length > 0);
  }

  useEffect(() => {
    recargar();
  }, [intervencionLocalId, actaTipo]);

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

  async function handleArchivo(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setProcesando(true);
    setError(null);
    try {
      await agregarFoto(intervencionLocalId, archivos[0], actaTipo);
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

  return (
    <div className={cn(card(), 'mt-[1rem]!')}>
      <div className="flex items-center justify-between mb-[0.75rem]">
        <span className="font-semibold text-[0.875rem] text-primary-900">
          {label ?? 'Foto del acta física firmada'}
          {obligatoria && <span className="text-danger"> *</span>}
        </span>
        {fotos.length > 0 && <span className={badge('success')}>Adjunta</span>}
      </div>

      {fotos.length === 0 && (
        <label
          className={cn(btn('outline'), 'flex! items-center! justify-center! gap-2!', procesando ? 'cursor-not-allowed!' : 'cursor-pointer!')}

        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleArchivo(e.target.files)}
            disabled={procesando} className="hidden"
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>{procesando ? 'Optimizando…' : 'Tomar foto del acta'}</span>
        </label>
      )}

      {error && (
        <div className={cn(alerta('error'), 'mt-[0.75rem]!')} role="alert">
          <span>{error}</span>
        </div>
      )}

      {fotos.length > 0 && (
        <div className={photoGrid}>
          {fotos.map((foto) => (
            <div key={foto.id} className={photoItem}>
              {foto.id !== undefined && previews[foto.id] && <img src={previews[foto.id]} alt="Acta física firmada" className={photoItemImg} />}
              <button
                type="button"
                className={photoItemRemove}
                onClick={() => handleEliminar(foto.id)}
                title="Eliminar foto"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {obligatoria && fotos.length === 0 && (
        <p className={cn(formHint, 'text-danger! mt-[0.5rem]! mb-0!')}>
          Debes adjuntar la foto del acta firmada para continuar.
        </p>
      )}
    </div>
  );
}
