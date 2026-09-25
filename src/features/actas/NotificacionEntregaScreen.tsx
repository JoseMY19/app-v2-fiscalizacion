import { useEffect, useState } from 'react';
import { ModoNotificacion } from '@pas-sjl/shared-types';
import { guardarEntregaNotificacionCargo, obtenerNotificacionCargo } from './notificacion-cargo.repository';

/**
 * HU-20 — Registrar negativa a firmar o identificarse. Habilita
 * características del domicilio (no obligatorias). Los 2 testigos ya NO
 * dependen de esta negativa (cambio de regla, 2026-09-14) — se capturan
 * siempre, en TestigosScreen, un paso antes en el flujo, para los 3 caminos.
 *
 * HU-21 — ¿Se entregó la NC en el acto? Sí → PERSONAL_FIRMA (o
 * PERSONAL_NEGATIVA si hubo negativa a firmar) + fecha/hora automática +
 * receptor. No → DOMICILIARIA_PENDIENTE, fechaNotificacion queda vacía
 * para siempre — dispara el motor de plazos futuro.
 *
 * Guarda fusionando el registro completo de NotificacionCargo (HU-13),
 * nunca reconstruyéndolo — ver notificacion-cargo.repository.ts.
 */

import WizardHeader from '../../components/WizardHeader';
import { cn } from '../../lib/cn';
import { actionsFooter, alerta, appContainer, btn, card, formGroup, formInput, formLabel, formLabelRequired, formTextarea, optionCard, optionCardContent, optionCardDesc, optionCardTitle, optionRadio, optionRadioDot, optionsGrid } from '../../lib/ui';

interface Props {
  localId: string;
  onContinuar: () => void;
  onVolver: () => void;
}

export default function NotificacionEntregaScreen({ localId, onContinuar, onVolver }: Props) {
  const [seNegoIdentificarse, setSeNegoIdentificarse] = useState(false);
  const [seNegoFirmar, setSeNegoFirmar] = useState(false);
  const [domicilioPuertas, setDomicilioPuertas] = useState('');
  const [domicilioPisos, setDomicilioPisos] = useState('');
  const [domicilioNumeroSuministro, setDomicilioNumeroSuministro] = useState('');
  const [domicilioObservaciones, setDomicilioObservaciones] = useState('');
  const [entregadaEnElActo, setEntregadaEnElActo] = useState<boolean | null>(null);
  const [receptorNombre, setReceptorNombre] = useState('');
  const [receptorDocumento, setReceptorDocumento] = useState('');
  const [receptorRelacion, setReceptorRelacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerNotificacionCargo(localId).then((nc) => {
      if (!nc) return;
      setSeNegoIdentificarse(nc.seNegoIdentificarse ?? false);
      setSeNegoFirmar(nc.seNegoFirmar ?? false);
      setDomicilioPuertas(nc.domicilioPuertas ?? '');
      setDomicilioPisos(nc.domicilioPisos ?? '');
      setDomicilioNumeroSuministro(nc.domicilioNumeroSuministro ?? '');
      setDomicilioObservaciones(nc.domicilioObservaciones ?? '');
      if (nc.modoNotificacion) setEntregadaEnElActo(nc.modoNotificacion !== ModoNotificacion.DOMICILIARIA_PENDIENTE);
      setReceptorNombre(nc.receptorNombre ?? '');
      setReceptorDocumento(nc.receptorDocumento ?? '');
      setReceptorRelacion(nc.receptorRelacion ?? '');
    });
  }, [localId]);

  const hayNegativa = seNegoIdentificarse || seNegoFirmar;
  const puedeGuardar = entregadaEnElActo !== null;

  async function handleGuardar() {
    if (!puedeGuardar || entregadaEnElActo === null || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarEntregaNotificacionCargo(localId, {
        seNegoIdentificarse,
        seNegoFirmar,
        domicilioPuertas,
        domicilioPisos,
        domicilioNumeroSuministro,
        domicilioObservaciones,
        entregadaEnElActo,
        receptorNombre,
        receptorDocumento,
        receptorRelacion,
      });
      onContinuar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la entrega de la Notificación de Cargo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={6}
        totalPasos={8}
        titulo="Diligencia de Entrega de NC"
        subtitulo="Registro de constancia de entrega o negativa en el acto físico"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      {/* Tarjeta 1: Constancia de Negativa */}
      <div className={card()}>
        <label className={cn(formLabel, 'mb-[0.75rem]!')}>
          Constancia física de negativa (si aplica)
        </label>

        <div className="flex flex-col gap-[0.625rem]">
          <label className={cn(optionCard(seNegoIdentificarse), 'cursor-pointer!')}>
            <input
              type="checkbox"
              checked={seNegoIdentificarse}
              onChange={(e) => setSeNegoIdentificarse(e.target.checked)} className="w-[18px] h-[18px] accent-primary-600"
            />
            <span className={optionCardTitle}>El administrado se negó a identificarse</span>
          </label>

          <label className={cn(optionCard(seNegoFirmar), 'cursor-pointer!')}>
            <input
              type="checkbox"
              checked={seNegoFirmar}
              onChange={(e) => setSeNegoFirmar(e.target.checked)} className="w-[18px] h-[18px] accent-primary-600"
            />
            <span className={optionCardTitle}>El administrado se negó a firmar el cargo físico</span>
          </label>
        </div>
      </div>

      {/* Tarjeta 2: características del domicilio, si hubo negativa */}
      {hayNegativa && (
        <div className={card('warning')}>
          <h3 className="text-[0.875rem] uppercase tracking-[0.05em] text-text-muted mt-0 mr-0 mb-[0.5rem] ml-0">
            Características del Inmueble (Opcional)
          </h3>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-[0.5rem] mb-[0.5rem]">
            <input
              type="text"
              className={formInput}
              value={domicilioPuertas}
              onChange={(e) => setDomicilioPuertas(e.target.value)}
              placeholder="Puertas (color/mat.)"
            />
            <input
              type="text"
              className={formInput}
              value={domicilioPisos}
              onChange={(e) => setDomicilioPisos(e.target.value)}
              placeholder="N° de pisos"
            />
            <input
              type="text"
              className={formInput}
              value={domicilioNumeroSuministro}
              onChange={(e) => setDomicilioNumeroSuministro(e.target.value)}
              placeholder="N° Suministro luz/agua"
            />
          </div>
          <textarea
            className={formTextarea}
            value={domicilioObservaciones}
            onChange={(e) => setDomicilioObservaciones(e.target.value)}
            rows={2}
            placeholder="Otras referencias del predio (fachada, linderos)..."
          />
        </div>
      )}

      {/* Tarjeta 3: ¿Se entregó en el acto? */}
      <div className={card()}>
        <label className={cn(formLabel, formLabelRequired, 'mb-[0.75rem]!')}>
          ¿Se entregó la Notificación de Cargo en el acto?
        </label>

        <div className={optionsGrid}>
          <div
            className={optionCard(entregadaEnElActo === true)}
            onClick={() => setEntregadaEnElActo(true)}
            role="button"
            tabIndex={0}
          >
            <div className={optionRadio(entregadaEnElActo === true)}>
              <div className={optionRadioDot(entregadaEnElActo === true)} />
            </div>
            <div className={optionCardContent}>
              <div className={optionCardTitle}>Sí, entregada en el acto</div>
              <div className={optionCardDesc}>
                {seNegoFirmar ? 'Se registra la negativa a firmar, ' : 'Se registra la firma, '}
                con fecha y hora actual.
              </div>
            </div>
          </div>

          <div
            className={optionCard(entregadaEnElActo === false)}
            onClick={() => setEntregadaEnElActo(false)}
            role="button"
            tabIndex={0}
          >
            <div className={optionRadio(entregadaEnElActo === false)}>
              <div className={optionRadioDot(entregadaEnElActo === false)} />
            </div>
            <div className={optionCardContent}>
              <div className={optionCardTitle}>No entregada en el acto</div>
              <div className={optionCardDesc}>
                Queda como "pendiente de notificación domiciliaria".
              </div>
            </div>
          </div>
        </div>

        {entregadaEnElActo === true && (
          <div className="mt-[1rem] pt-[1rem] border-t border-solid border-t-border">
            <h3 className="text-[0.9375rem] mb-[0.75rem] text-primary-900">
              Datos del Receptor (si fue persona distinta o adicional)
            </h3>
            <div className={formGroup}>
              <label className={formLabel}>Nombre del receptor (opcional)</label>
              <input
                type="text"
                className={formInput}
                value={receptorNombre}
                onChange={(e) => setReceptorNombre(e.target.value)}
                placeholder="Nombres y apellidos de quien recepciona"
              />
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-[0.75rem]">
              <div className={formGroup}>
                <label className={formLabel}>DNI / Documento</label>
                <input
                  type="text"
                  className={formInput}
                  value={receptorDocumento}
                  onChange={(e) => setReceptorDocumento(e.target.value)}
                  placeholder="N° de identidad"
                />
              </div>
              <div className={formGroup}>
                <label className={formLabel}>Relación con administrado</label>
                <input
                  type="text"
                  className={formInput}
                  value={receptorRelacion}
                  onChange={(e) => setReceptorRelacion(e.target.value)}
                  placeholder="Empleado, cónyuge, etc."
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className={cn(alerta('error'), 'mt-[1rem]! mb-0!')} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className={actionsFooter}>
        <button
          type="button"
          className={btn('primary', { tamano: 'lg', block: true })}
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
        >
          {guardando ? (
            <span>Guardando…</span>
          ) : (
            <>
              <span>Continuar a Actas Adicionales</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
