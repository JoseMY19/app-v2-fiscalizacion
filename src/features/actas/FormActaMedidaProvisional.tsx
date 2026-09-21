import { useState } from 'react';
import { TipoActa } from '@pas-sjl/shared-types';
import { guardarActaMedidaProvisional } from './acta-medida-provisional.repository';
import CampoNumeroCorrelativo from './CampoNumeroCorrelativo';
import { useVerificacionCorrelativo } from './useVerificacionCorrelativo';
import AdjuntarFotoActa from '../evidencia/AdjuntarFotoActa';
import EscanearActaOcr from './EscanearActaOcr';
import type { DatosOcrActa } from '../../lib/ocr-offline';

/**
 * HU-14 — Acta de Medida Provisional. tipoMedida: CLAUSURA/PARALIZACION
 * (Retención y Decomiso van por ActaAdicional) más "Otros" (pedido
 * explícito de negocio, reunión 2026-09: hay más tipos reales — retiro
 * de animal, cancelación de espectáculo público, etc. — que no están en
 * una lista fija, así que "Otros" exige describir cuál en el campo
 * Descripción). Sin preselección automática al abrir la pantalla — el
 * escaneo OCR puede sugerirlo (ver EscanearActaOcr), pero el
 * fiscalizador siempre confirma a mano antes de guardar.
 */

const OPCIONES: { valor: 'CLAUSURA' | 'PARALIZACION' | 'OTROS'; etiqueta: string }[] = [
  { valor: 'CLAUSURA', etiqueta: 'Clausura' },
  { valor: 'PARALIZACION', etiqueta: 'Paralización' },
  { valor: 'OTROS', etiqueta: 'Otros' },
];

interface Props {
  localId: string;
  onGuardada: () => void;
}

export default function FormActaMedidaProvisional({ localId, onGuardada }: Props) {
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');
  const [tipoMedida, setTipoMedida] = useState<'CLAUSURA' | 'PARALIZACION' | 'OTROS' | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [lugarEjecucion, setLugarEjecucion] = useState('');
  const [observacionesAdministrado, setObservacionesAdministrado] = useState('');
  const [guardando, setGuardando] = useState(false);

  const estadoCorrelativo = useVerificacionCorrelativo(TipoActa.MEDIDA_PROVISIONAL, numeroCorrelativo, localId);
  const requiereDescripcion = tipoMedida === 'OTROS';
  const puedeGuardar =
    numeroCorrelativo.trim().length > 0 &&
    estadoCorrelativo !== 'duplicado' &&
    tipoMedida !== null &&
    (!requiereDescripcion || descripcion.trim().length > 0);

  function handleSugerenciasOcr(datos: DatosOcrActa) {
    if (datos.numeroCorrelativo) setNumeroCorrelativo(datos.numeroCorrelativo);
    if (datos.tipoMedida === 'CLAUSURA' || datos.tipoMedida === 'PARALIZACION' || datos.tipoMedida === 'OTROS') {
      setTipoMedida(datos.tipoMedida);
    }
    if (datos.descripcion) setDescripcion(datos.descripcion);
    if (datos.lugarEjecucion) setLugarEjecucion(datos.lugarEjecucion);
    if (datos.observacionesAdministrado) setObservacionesAdministrado(datos.observacionesAdministrado);
  }

  async function handleGuardar() {
    if (!puedeGuardar || !tipoMedida || guardando) return;
    setGuardando(true);
    try {
      await guardarActaMedidaProvisional(localId, {
        numeroCorrelativo,
        tipoMedida,
        descripcion,
        lugarEjecucion,
        observacionesAdministrado,
      });
      setNumeroCorrelativo('');
      setTipoMedida(null);
      setDescripcion('');
      setLugarEjecucion('');
      setObservacionesAdministrado('');
      onGuardada();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <EscanearActaOcr tipoActa="MEDIDA_PROVISIONAL" onSugerencias={handleSugerenciasOcr} />

      <CampoNumeroCorrelativo value={numeroCorrelativo} onChange={setNumeroCorrelativo} estado={estadoCorrelativo} />

      <div className="form-group">
        <label className="form-label form-label-required">Tipo de medida provisional</label>
        <div className="options-grid" style={{ marginBottom: 0 }}>
          {OPCIONES.map((opcion) => {
            const isSelected = tipoMedida === opcion.valor;
            return (
              <div
                key={opcion.valor}
                className={`option-card ${isSelected ? 'option-card--selected' : ''}`}
                onClick={() => setTipoMedida(opcion.valor)}
                role="button"
                tabIndex={0}
                style={{ padding: '0.625rem 0.875rem' }}
              >
                <div className="option-radio">
                  <div className="option-radio-dot" />
                </div>
                <div className="option-card-content">
                  <div className="option-card-title">{opcion.etiqueta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label className={`form-label ${requiereDescripcion ? 'form-label-required' : ''}`}>
          Descripción {requiereDescripcion ? '(indica qué tipo de medida es)' : '(opcional)'}
        </label>
        <input
          type="text"
          className="form-input"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={requiereDescripcion ? 'Ej. Retiro del animal, cancelación de espectáculo público...' : 'Ej. Clausura temporal del establecimiento comercial'}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Lugar de ejecución (opcional)</label>
        <input
          type="text"
          className="form-input"
          value={lugarEjecucion}
          onChange={(e) => setLugarEjecucion(e.target.value)}
          placeholder="Ej. Puerta de acceso principal"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Observaciones formuladas por el administrado (opcional)</label>
        <textarea
          className="form-textarea"
          value={observacionesAdministrado}
          onChange={(e) => setObservacionesAdministrado(e.target.value)}
          rows={2}
          placeholder="Lo que manifiesta el administrado al momento de ejecutar la medida..."
        />
      </div>

      <AdjuntarFotoActa
        intervencionLocalId={localId}
        actaTipo="ACTA_MEDIDA_PROVISIONAL"
        obligatoria={false}
        label="Foto del acta física de medida provisional (opcional)"
      />

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleGuardar}
        disabled={!puedeGuardar || guardando}
        style={{ marginTop: '0.75rem' }}
      >
        {guardando ? 'Guardando…' : 'Guardar Medida Provisional'}
      </button>
    </div>
  );
}
