import { useEffect, useState, type ReactNode } from 'react';
import PanelFirma from './PanelFirma';
import { eliminarFirma, guardarFirma, obtenerFirma } from './firmas.repository';
import { guardarFirmaPerfilLocal, obtenerFirmaPerfil } from './firma-perfil.repository';
import { obtenerFiscalizadorActivo } from '../auth/auth.repository';
import { db, type FirmaLocal } from '../../lib/db';

/**
 * HU-18 — Firmas del acta. Desde el 2026-10-09:
 * - Inspector: usa su firma registrada (se copia sola a la intervención,
 *   también sin red). La primera firma que dibuja queda como su firma
 *   registrada; si la rehace, elige si reemplaza la registrada.
 * - Administrado: firma opcional en el celular del fiscalizador, o se marca
 *   que se negó. La foto del acta física firmada se mantiene como respaldo.
 */
import WizardHeader from '../../components/WizardHeader';
import { actionsFooter, appContainer, badge, btn, card, formHint, optionCard, optionCardTitle } from '../../lib/ui';
import { cn } from '../../lib/cn';

interface Props {
  localId: string;
  onContinuar: () => void;
  onVolver: () => void;
}

/** Vista previa de la firma guardada, o el panel para dibujarla. */
function AreaFirma({
  firma,
  alt,
  onFirmar,
}: {
  firma: FirmaLocal | undefined;
  alt: string;
  onFirmar: (blob: Blob) => Promise<void>;
}) {
  const [rehaciendo, setRehaciendo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!firma) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(firma.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [firma]);

  async function firmar(blob: Blob) {
    await onFirmar(blob);
    setRehaciendo(false);
  }

  if (!firma || rehaciendo) {
    return (
      <div>
        <PanelFirma onFirmar={firmar} />
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
    );
  }

  return (
    <div className="text-center py-[1rem] px-0">
      <div className="inline-block py-[0.75rem] px-[1.5rem] bg-white border-[1.5px] border-solid border-border rounded-md shadow-xs mb-[1rem]">
        {previewUrl && <img src={previewUrl} alt={alt} className="max-h-[110px] max-w-full block my-0 mx-auto" />}
      </div>
      <div>
        <button type="button" className={btn('outline', { tamano: 'sm' })} onClick={() => setRehaciendo(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>Rehacer trazo de firma</span>
        </button>
      </div>
    </div>
  );
}

function Tarjeta({ titulo, estado, children }: { titulo: string; estado: ReactNode; children: ReactNode }) {
  return (
    <div className={card()}>
      <div className="flex items-center justify-between gap-[0.5rem] mb-[0.75rem]">
        <span className="font-semibold text-[0.9375rem] text-primary-900">{titulo}</span>
        {estado}
      </div>
      {children}
    </div>
  );
}

export default function FirmaScreen({ localId, onContinuar, onVolver }: Props) {
  const usuarioId = obtenerFiscalizadorActivo();
  const [firmaInspector, setFirmaInspector] = useState<FirmaLocal | undefined>(undefined);
  const [firmaAdministrado, setFirmaAdministrado] = useState<FirmaLocal | undefined>(undefined);
  const [seNegoFirmar, setSeNegoFirmar] = useState(false);
  const [esFirmaRegistrada, setEsFirmaRegistrada] = useState(false);
  // Solo aparece cuando rehace la firma teniendo ya una registrada.
  const [ofrecerReemplazo, setOfrecerReemplazo] = useState(false);
  const [reemplazarRegistrada, setReemplazarRegistrada] = useState(false);
  const [avisoPrimeraFirma, setAvisoPrimeraFirma] = useState(false);

  useEffect(() => {
    let vigente = true;
    (async () => {
      let inspector = await obtenerFirma(localId, 'INSPECTOR');
      const perfil = usuarioId ? await obtenerFirmaPerfil(usuarioId) : undefined;
      // Sin firma en esta intervención: se copia la firma registrada (funciona sin red).
      if (!inspector && perfil) {
        await guardarFirma(localId, 'INSPECTOR', perfil.blob);
        inspector = await obtenerFirma(localId, 'INSPECTOR');
      }
      const [administrado, nc] = await Promise.all([
        obtenerFirma(localId, 'ADMINISTRADO'),
        db.notificacionesCargo.get(localId),
      ]);
      if (!vigente) return;
      setFirmaInspector(inspector);
      setEsFirmaRegistrada(!!perfil && !!inspector);
      setFirmaAdministrado(administrado);
      setSeNegoFirmar(nc?.seNegoFirmar === true && !administrado);
    })();
    return () => {
      vigente = false;
    };
  }, [localId, usuarioId]);

  async function firmarInspector(blob: Blob) {
    await guardarFirma(localId, 'INSPECTOR', blob);
    setFirmaInspector(await obtenerFirma(localId, 'INSPECTOR'));
    const perfil = usuarioId ? await obtenerFirmaPerfil(usuarioId) : undefined;
    if (usuarioId && !perfil) {
      // Primera firma del fiscalizador: queda como su firma registrada.
      await guardarFirmaPerfilLocal(usuarioId, blob);
      setEsFirmaRegistrada(true);
      setAvisoPrimeraFirma(true);
    } else {
      setEsFirmaRegistrada(false);
      setOfrecerReemplazo(true);
      setReemplazarRegistrada(false);
    }
  }

  async function firmarAdministrado(blob: Blob) {
    await guardarFirma(localId, 'ADMINISTRADO', blob);
    setFirmaAdministrado(await obtenerFirma(localId, 'ADMINISTRADO'));
  }

  async function cambiarNegativa(negativa: boolean) {
    setSeNegoFirmar(negativa);
    if (negativa) {
      await eliminarFirma(localId, 'ADMINISTRADO');
      setFirmaAdministrado(undefined);
    }
  }

  async function continuar() {
    if (ofrecerReemplazo && reemplazarRegistrada && firmaInspector && usuarioId) {
      await guardarFirmaPerfilLocal(usuarioId, firmaInspector.blob);
    }
    onContinuar();
  }

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={8}
        totalPasos={8}
        titulo="Firmas del Acta"
        subtitulo="Firma del inspector y del administrado o su representante"
        onVolver={onVolver}
      />

      <Tarjeta
        titulo="Firma del inspector"
        estado={
          <span className={badge(firmaInspector ? (esFirmaRegistrada ? 'primary' : 'success') : 'warning')}>
            {firmaInspector ? (esFirmaRegistrada ? 'Tu firma registrada' : 'Firmada') : 'Pendiente'}
          </span>
        }
      >
        <AreaFirma firma={firmaInspector} alt="Firma del inspector" onFirmar={firmarInspector} />
        {avisoPrimeraFirma && (
          <p className={cn(formHint, 'text-center!')}>Quedó guardada como tu firma registrada para las siguientes intervenciones.</p>
        )}
        {ofrecerReemplazo && firmaInspector && (
          <label className={cn(optionCard(reemplazarRegistrada), 'cursor-pointer! mt-[0.75rem]')}>
            <input
              type="checkbox"
              checked={reemplazarRegistrada}
              onChange={(e) => setReemplazarRegistrada(e.target.checked)}
              className="w-[18px] h-[18px] accent-primary-600"
            />
            <span className={optionCardTitle}>Usar esta firma como mi firma registrada</span>
          </label>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Firma del administrado / representante"
        estado={
          <span className={badge(firmaAdministrado ? 'success' : seNegoFirmar ? 'danger' : 'neutral')}>
            {firmaAdministrado ? 'Firmada' : seNegoFirmar ? 'Se negó' : 'Opcional'}
          </span>
        }
      >
        <label className={cn(optionCard(seNegoFirmar), 'cursor-pointer! mb-[0.75rem]')}>
          <input
            type="checkbox"
            checked={seNegoFirmar}
            onChange={(e) => cambiarNegativa(e.target.checked)}
            className="w-[18px] h-[18px] accent-primary-600"
          />
          <span className={optionCardTitle}>El administrado se negó a firmar</span>
        </label>
        {seNegoFirmar ? (
          <p className={formHint}>Se registra la negativa. La foto del acta física sigue siendo obligatoria como respaldo.</p>
        ) : (
          <>
            <p className={cn(formHint, 'mb-[0.5rem]')}>Pásale el celular al administrado para que firme.</p>
            <AreaFirma firma={firmaAdministrado} alt="Firma del administrado" onFirmar={firmarAdministrado} />
          </>
        )}
      </Tarjeta>

      <div className={actionsFooter}>
        <button type="button" className={btn('primary', { tamano: 'lg', block: true })} onClick={continuar}>
          <span>Revisar Resumen y Finalizar</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        {!firmaInspector && (
          <p className={cn(formHint, 'text-center! text-warning!')}>
            Falta la firma del inspector — puedes continuar sin ella por ahora.
          </p>
        )}
      </div>
    </div>
  );
}
