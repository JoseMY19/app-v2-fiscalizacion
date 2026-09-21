import { useEffect, useState } from 'react';
import { MotivoNoIdentificado } from '@pas-sjl/shared-types';
import { db } from '../../lib/db';
import { guardarAdministrado, marcarAdministradoNoIdentificado } from './administrado.repository';
import { validarNumeroDocumento, type TipoDocumentoAdministrado } from './validacion-documento';

/**
 * HU-04 — Registrar datos del administrado.
 * Criterios de aceptación:
 *  - campos: tipo y N° de documento, nombres/razón social, domicilio,
 *    distrito, giro/uso, N° de licencia de funcionamiento (opcional)
 *  - validación de formato de DNI/RUC
 *  - permite guardar aunque falten campos no obligatorios (licencia)
 *
 * HU-05 — Marcar administrado no identificado.
 * Criterios de aceptación:
 *  - botón explícito "No se pudo identificar", con motivo
 *  - la intervención avanza igual, anclada solo por GPS
 *  - queda marcada como "Pendiente de saneamiento" (ver HU-19, resumen)
 */

import WizardHeader from '../../components/WizardHeader';

const MOTIVOS: { valor: MotivoNoIdentificado; etiqueta: string; desc: string }[] = [
  { valor: MotivoNoIdentificado.VIA_PUBLICA, etiqueta: 'Vía pública', desc: 'Comercio o actividad realizada en espacio público sin puesto fijo' },
  { valor: MotivoNoIdentificado.SIN_OCUPANTE, etiqueta: 'Sin ocupante', desc: 'Predio o local cerrado, sin personas que atiendan' },
  { valor: MotivoNoIdentificado.SE_NEGO, etiqueta: 'Se negó', desc: 'El administrado o encargado rechazó brindar sus datos' },
  { valor: MotivoNoIdentificado.OTRO, etiqueta: 'Otro motivo', desc: 'Situación excepcional registrada por el fiscalizador' },
];

interface Props {
  localId: string;
  onFinalizar: (resultado: { identificado: boolean }) => void;
  onVolver: () => void;
}

export default function AdministradoScreen({ localId, onFinalizar, onVolver }: Props) {
  const [mostrandoNoIdentificado, setMostrandoNoIdentificado] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoAdministrado>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [nombresRazonSocial, setNombresRazonSocial] = useState('');
  const [domicilio, setDomicilio] = useState('');
  // Precargado: casi toda intervención es en San Juan de Lurigancho (la
  // municipalidad solo fiscaliza dentro de su propia jurisdicción) — sigue
  // siendo editable por si el domicilio del administrado queda en otro
  // distrito colindante.
  const [distrito, setDistrito] = useState('San Juan de Lurigancho');
  const [giroUso, setGiroUso] = useState('');
  const [numeroLicenciaFuncionamiento, setNumeroLicenciaFuncionamiento] = useState('');
  const [motivo, setMotivo] = useState<MotivoNoIdentificado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HU-19: precarga lo ya guardado, sea el camino identificado o no-identificado.
  useEffect(() => {
    db.administrados.get(localId).then((administrado) => {
      if (!administrado) return;
      if (!administrado.identificado) {
        setMostrandoNoIdentificado(true);
        if (administrado.motivoNoIdentificado) setMotivo(administrado.motivoNoIdentificado);
        return;
      }
      setTipoDocumento((administrado.tipoDocumento as TipoDocumentoAdministrado) ?? 'DNI');
      setNumeroDocumento(administrado.numeroDocumento ?? '');
      setNombresRazonSocial(administrado.nombresRazonSocial ?? '');
      setDomicilio(administrado.domicilio ?? '');
      setDistrito(administrado.distrito || 'San Juan de Lurigancho');
      setGiroUso(administrado.giroUso ?? '');
      setNumeroLicenciaFuncionamiento(administrado.numeroLicenciaFuncionamiento ?? '');
    });
  }, [localId]);

  async function handleGuardar() {
    const errorDocumento = validarNumeroDocumento(tipoDocumento, numeroDocumento);
    if (errorDocumento) {
      setError(errorDocumento);
      return;
    }
    if (!nombresRazonSocial.trim() || !domicilio.trim() || !distrito.trim() || !giroUso.trim()) {
      setError('Nombres/razón social, domicilio, distrito y giro/uso son obligatorios.');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await guardarAdministrado(localId, {
        tipoDocumento,
        numeroDocumento: numeroDocumento.trim(),
        nombresRazonSocial: nombresRazonSocial.trim(),
        domicilio: domicilio.trim(),
        distrito: distrito.trim(),
        giroUso: giroUso.trim(),
        numeroLicenciaFuncionamiento,
      });
      onFinalizar({ identificado: true });
    } finally {
      setGuardando(false);
    }
  }

  async function handleConfirmarNoIdentificado() {
    if (!motivo || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await marcarAdministradoNoIdentificado(localId, motivo);
      onFinalizar({ identificado: false });
    } finally {
      setGuardando(false);
    }
  }

  if (mostrandoNoIdentificado) {
    return (
      <div className="app-container">
        <WizardHeader
          pasoActual={3}
          totalPasos={8}
          titulo="Administrado No Identificado"
          subtitulo="Registro anclado únicamente a la ubicación GPS capturada"
          onVolver={onVolver}
          deshabilitarVolver={guardando}
        />

        <div className="card">
          <div className="saneamiento-notice">
            <div className="saneamiento-notice-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <div className="saneamiento-notice-title">Pendiente de saneamiento legal</div>
              <div className="saneamiento-notice-desc">
                La intervención continuará el proceso y quedará marcada para regularización en gabinete.
              </div>
            </div>
          </div>

          <div className="section-label">
            <span>Selecciona el motivo de no identificación</span>
            <span className="section-label-required">*</span>
          </div>

          <div className="options-grid">
            {MOTIVOS.map((opcion) => {
              const isSelected = motivo === opcion.valor;
              return (
                <div
                  key={opcion.valor}
                  className={`option-card ${isSelected ? 'option-card--selected' : ''}`}
                  onClick={() => setMotivo(opcion.valor)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="option-radio">
                    <div className="option-radio-dot" />
                  </div>
                  <div className="option-card-content">
                    <div className="option-card-title">{opcion.etiqueta}</div>
                    <div className="option-card-desc">{opcion.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="actions-footer">
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            onClick={handleConfirmarNoIdentificado}
            disabled={!motivo || guardando}
          >
            {guardando ? 'Guardando…' : 'Confirmar y Continuar'}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => setMostrandoNoIdentificado(false)}
            disabled={guardando}
          >
            ← Volver a identificar al administrado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <WizardHeader
        pasoActual={3}
        totalPasos={8}
        titulo="Datos del Administrado"
        subtitulo="Identificación de la persona natural o jurídica intervenida"
        onVolver={onVolver}
        deshabilitarVolver={guardando}
      />

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label form-label-required">Tipo doc.</label>
            <select
              className="form-select"
              value={tipoDocumento}
              onChange={(e) => setTipoDocumento(e.target.value as TipoDocumentoAdministrado)}
            >
              <option value="DNI">DNI</option>
              <option value="RUC">RUC</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">N° de documento</label>
            <input
              type="text"
              className="form-input"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="N° de identidad"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label form-label-required">Nombres / Razón social</label>
          <input
            type="text"
            className="form-input"
            value={nombresRazonSocial}
            onChange={(e) => setNombresRazonSocial(e.target.value)}
            placeholder="Nombre completo o razón social comercial"
          />
        </div>

        <div className="form-group">
          <label className="form-label form-label-required">Domicilio intervenido</label>
          <input
            type="text"
            className="form-input"
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            placeholder="Av., Jr., Calle, N° o Mz. Lt."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label form-label-required">Distrito</label>
            <input
              type="text"
              className="form-input"
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              placeholder="San Juan de Lurigancho"
            />
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Giro / Actividad</label>
            <input
              type="text"
              className="form-input"
              value={giroUso}
              onChange={(e) => setGiroUso(e.target.value)}
              placeholder="Bodega, Taller, etc."
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">N° Licencia de funcionamiento (opcional)</label>
          <input
            type="text"
            className="form-input"
            value={numeroLicenciaFuncionamiento}
            onChange={(e) => setNumeroLicenciaFuncionamiento(e.target.value)}
            placeholder="N° de licencia municipal si la exhibe"
          />
        </div>

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
          disabled={guardando}
        >
          {guardando ? (
            <span>Guardando…</span>
          ) : (
            <>
              <span>Guardar Administrado</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => setMostrandoNoIdentificado(true)}
          disabled={guardando}
        >
          No se pudo identificar al administrado
        </button>
      </div>
    </div>
  );
}
