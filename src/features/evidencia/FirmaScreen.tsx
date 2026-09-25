import { useEffect, useState } from 'react';
import PanelFirma from './PanelFirma';
import { guardarFirmaInspector, obtenerFirmaInspector } from './firmas.repository';
import type { FirmaLocal } from '../../lib/db';

/**
 * HU-18 — Captura de firma del inspector (ver lib/db.ts sobre por qué la
 * del administrado no se captura digitalmente aquí).
 */
import WizardHeader from '../../components/WizardHeader';
import { actionsFooter, appContainer, badge, btn, card, formHint } from '../../lib/ui';
import { cn } from '../../lib/cn';

interface Props {
  localId: string;
  onContinuar: () => void;
  onVolver: () => void;
}

export default function FirmaScreen({ localId, onContinuar, onVolver }: Props) {
  const [firmaGuardada, setFirmaGuardada] = useState<FirmaLocal | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rehaciendo, setRehaciendo] = useState(false);

  async function recargar() {
    const firma = await obtenerFirmaInspector(localId);
    setFirmaGuardada(firma);
  }

  useEffect(() => {
    recargar();
  }, [localId]);

  useEffect(() => {
    if (!firmaGuardada) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(firmaGuardada.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [firmaGuardada]);

  async function handleFirmar(blob: Blob) {
    await guardarFirmaInspector(localId, blob);
    setRehaciendo(false);
    await recargar();
  }

  const mostrarPanel = rehaciendo || !firmaGuardada;

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={8}
        totalPasos={8}
        titulo="Firma del Inspector"
        subtitulo="Suscripción digital de conformidad del acta por el personal interviniente"
        onVolver={onVolver}
      />

      <div className={card()}>
        <div className="flex items-center justify-between mb-[1rem]">
          <span className="font-semibold text-[0.9375rem] text-primary-900">
            Firma digitalizada
          </span>
          <span className={badge(firmaGuardada ? 'success' : 'warning')}>
            {firmaGuardada ? 'Firma Registrada' : 'Pendiente'}
          </span>
        </div>

        {!mostrarPanel && previewUrl && (
          <div className="text-center py-[1rem] px-0">
            <div className="inline-block py-[0.75rem] px-[1.5rem] bg-white border-[1.5px] border-solid border-border rounded-md shadow-xs mb-[1rem]">
              <img
                src={previewUrl}
                alt="Firma del inspector fiscalizador" className="max-h-[110px] max-w-full block my-0 mx-auto"
              />
            </div>
            <div>
              <button
                type="button"
                className={btn('outline', { tamano: 'sm' })}
                onClick={() => setRehaciendo(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Rehacer trazo de firma</span>
              </button>
            </div>
          </div>
        )}

        {mostrarPanel && (
          <div>
            <PanelFirma onFirmar={handleFirmar} />
            {rehaciendo && (
              <button
                type="button"
                className={cn(btn('secondary', { tamano: 'sm', block: true }), 'mt-[0.5rem]!')}
                onClick={() => setRehaciendo(false)}
              >
                Cancelar y mantener firma previa
              </button>
            )}
          </div>
        )}
      </div>

      <div className={actionsFooter}>
        <button
          type="button"
          className={btn('primary', { tamano: 'lg', block: true })}
          onClick={onContinuar}
        >
          <span>Revisar Resumen y Finalizar</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        {!firmaGuardada && (
          <p className={cn(formHint, 'text-center! text-warning!')}>
            No has capturado firma — puedes continuar sin ella por ahora (HU-18 despriorizada).
          </p>
        )}
      </div>
    </div>
  );
}
