import { useState } from 'react';
import { TipoActa } from '@pas-sjl/shared-types';
import { guardarActaValorizacionObra } from './acta-valorizacion-obra.repository';
import CampoNumeroCorrelativo from './CampoNumeroCorrelativo';
import { useVerificacionCorrelativo } from './useVerificacionCorrelativo';
import AdjuntarFotoActa from '../evidencia/AdjuntarFotoActa';

interface Props {
  localId: string;
  onGuardada: () => void;
}

export default function FormActaValorizacionObra({ localId, onGuardada }: Props) {
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');
  const [estadoObra, setEstadoObra] = useState('');
  const [guardando, setGuardando] = useState(false);

  const estadoCorrelativo = useVerificacionCorrelativo(TipoActa.VALORIZACION_OBRA, numeroCorrelativo, localId);
  const puedeGuardar = numeroCorrelativo.trim().length > 0 && estadoCorrelativo !== 'duplicado';

  async function handleGuardar() {
    if (!puedeGuardar || guardando) return;
    setGuardando(true);
    try {
      await guardarActaValorizacionObra(localId, { numeroCorrelativo, estadoObra });
      setNumeroCorrelativo('');
      setEstadoObra('');
      onGuardada();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <CampoNumeroCorrelativo value={numeroCorrelativo} onChange={setNumeroCorrelativo} estado={estadoCorrelativo} />

      <div className="form-group">
        <label className="form-label">Estado de la obra (opcional)</label>
        <input
          type="text"
          className="form-input"
          value={estadoObra}
          onChange={(e) => setEstadoObra(e.target.value)}
          placeholder="Ej. En casco, acabado, cimientos..."
        />
      </div>

      <div className="alert alert-info" style={{ fontSize: '0.8125rem' }}>
        El monto de la multa por valorización se determina formalmente en oficina técnica, no en el aplicativo de campo.
      </div>

      <AdjuntarFotoActa
        intervencionLocalId={localId}
        actaTipo="ACTA_VALORIZACION_OBRA"
        obligatoria={false}
        label="Foto del acta física de valorización de obra (opcional)"
      />

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleGuardar}
        disabled={!puedeGuardar || guardando}
        style={{ marginTop: '0.75rem' }}
      >
        {guardando ? 'Guardando…' : 'Guardar Valorización de Obra'}
      </button>
    </div>
  );
}
