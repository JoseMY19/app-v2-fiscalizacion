import { useState } from 'react';
import { TipoActa } from '@pas-sjl/shared-types';
import { guardarActaAdicional } from './acta-adicional.repository';
import CampoNumeroCorrelativo from './CampoNumeroCorrelativo';
import { useVerificacionCorrelativo } from './useVerificacionCorrelativo';
import AdjuntarFotoActa from '../evidencia/AdjuntarFotoActa';

/** HU-14: formato aún no cerrado por el área legal (erd-sp1-decisiones.md §2.5) — detalle es texto libre. */
interface Props {
  localId: string;
  tipo: 'RETENCION_VEHICULO' | 'DECOMISO';
  onGuardada: () => void;
}

export default function FormActaAdicional({ localId, tipo, onGuardada }: Props) {
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);

  const estadoCorrelativo = useVerificacionCorrelativo(TipoActa.ADICIONAL, numeroCorrelativo, localId);
  const puedeGuardar = numeroCorrelativo.trim().length > 0 && estadoCorrelativo !== 'duplicado';

  async function handleGuardar() {
    if (!puedeGuardar || guardando) return;
    setGuardando(true);
    try {
      await guardarActaAdicional(localId, { tipo, numeroCorrelativo, detalle });
      setNumeroCorrelativo('');
      setDetalle('');
      onGuardada();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <CampoNumeroCorrelativo value={numeroCorrelativo} onChange={setNumeroCorrelativo} estado={estadoCorrelativo} />

      <div className="form-group">
        <label className="form-label">Detalle circunstanciado (opcional)</label>
        <textarea
          className="form-textarea"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          rows={2}
          placeholder="Descripción de los bienes retenidos o decomisados..."
        />
      </div>

      <AdjuntarFotoActa
        intervencionLocalId={localId}
        actaTipo="ACTA_ADICIONAL"
        obligatoria={false}
        label="Foto del acta física adicional (opcional)"
      />

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleGuardar}
        disabled={!puedeGuardar || guardando}
        style={{ marginTop: '0.75rem' }}
      >
        {guardando ? 'Guardando…' : `Guardar ${tipo === 'RETENCION_VEHICULO' ? 'Retención de Vehículo' : 'Decomiso'}`}
      </button>
    </div>
  );
}
