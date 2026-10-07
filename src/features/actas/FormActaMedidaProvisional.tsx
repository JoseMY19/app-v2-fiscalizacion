import { useState } from 'react';
import { TipoActa } from '@pas-sjl/shared-types';
import { guardarActaMedidaProvisional } from './acta-medida-provisional.repository';
import CampoNumeroCorrelativo from './CampoNumeroCorrelativo';
import { useVerificacionCorrelativo } from './useVerificacionCorrelativo';
import AdjuntarFotoActa from '../evidencia/AdjuntarFotoActa';
import EscanearActaOcr from './EscanearActaOcr';
import type { DatosOcrActa } from '../../lib/ocr-offline';
import type { TipoMedidaProvisional } from '../../lib/db';
import { cn } from '../../lib/cn';
import { btn, formGroup, formInput, formLabel, formHint, formLabelRequired, formTextarea, optionCard, optionCardContent, optionCardTitle, optionRadio, optionRadioDot, optionsGrid } from '../../lib/ui';

/**
 * HU-14 — Acta de Medida Provisional. C2 (2026-09-30): catálogo ampliado
 * con los tipos reales que describió el área (retención, decomiso,
 * cancelación de evento, retiro de animal) más "Otros", que exige
 * describir cuál en el campo Descripción. El acta aparte de Retención de
 * Vehículos / Decomiso sigue yendo por ActaAdicional.
 * C3: "¿Se ejecutó la medida en el acto?" es obligatoria (a veces se ordena
 * en campo y se ejecuta después, p. ej. en vía coactiva). C4: si se
 * ejecutó, se ofrece una foto opcional de la medida ejecutada. Sin preselección automática al abrir la pantalla — el
 * escaneo OCR puede sugerirlo (ver EscanearActaOcr), pero el
 * fiscalizador siempre confirma a mano antes de guardar.
 */

const OPCIONES: { valor: TipoMedidaProvisional; etiqueta: string }[] = [
  { valor: 'CLAUSURA', etiqueta: 'Clausura' },
  { valor: 'PARALIZACION', etiqueta: 'Paralización de obra' },
  { valor: 'RETENCION', etiqueta: 'Retención' },
  { valor: 'DECOMISO', etiqueta: 'Decomiso' },
  { valor: 'CANCELACION_EVENTO', etiqueta: 'Cancelación de evento' },
  { valor: 'RETIRO_ANIMAL', etiqueta: 'Retiro de animal' },
  { valor: 'OTROS', etiqueta: 'Otros' },
];

const OPCIONES_EJECUCION: { valor: boolean; etiqueta: string }[] = [
  { valor: true, etiqueta: 'Sí' },
  { valor: false, etiqueta: 'No' },
];

function esTipoMedida(valor: string | undefined): valor is TipoMedidaProvisional {
  return OPCIONES.some((o) => o.valor === valor);
}

interface Props {
  localId: string;
  onGuardada: () => void;
}

export default function FormActaMedidaProvisional({ localId, onGuardada }: Props) {
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');
  const [tipoMedida, setTipoMedida] = useState<TipoMedidaProvisional | null>(null);
  // Sin valor por defecto: el fiscalizador siempre responde Sí/No.
  const [seEjecutoEnActo, setSeEjecutoEnActo] = useState<boolean | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [lugarEjecucion, setLugarEjecucion] = useState('');
  const [observacionesAdministrado, setObservacionesAdministrado] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Foto obligatoria del acta física (y de la medida, si se ejecutó en el acto).
  const [tieneFotoActa, setTieneFotoActa] = useState(false);
  const [tieneFotoEjecucion, setTieneFotoEjecucion] = useState(false);

  const estadoCorrelativo = useVerificacionCorrelativo(TipoActa.MEDIDA_PROVISIONAL, numeroCorrelativo, localId);
  const requiereDescripcion = tipoMedida === 'OTROS';
  const puedeGuardar =
    numeroCorrelativo.trim().length > 0 &&
    estadoCorrelativo !== 'duplicado' &&
    tipoMedida !== null &&
    seEjecutoEnActo !== null &&
    (!requiereDescripcion || descripcion.trim().length > 0) &&
    tieneFotoActa &&
    (seEjecutoEnActo !== true || tieneFotoEjecucion);

  function handleSugerenciasOcr(datos: DatosOcrActa) {
    if (datos.numeroCorrelativo) setNumeroCorrelativo(datos.numeroCorrelativo);
    if (esTipoMedida(datos.tipoMedida)) setTipoMedida(datos.tipoMedida);
    if (datos.descripcion) setDescripcion(datos.descripcion);
    if (datos.lugarEjecucion) setLugarEjecucion(datos.lugarEjecucion);
    if (datos.observacionesAdministrado) setObservacionesAdministrado(datos.observacionesAdministrado);
  }

  async function handleGuardar() {
    if (!puedeGuardar || !tipoMedida || seEjecutoEnActo === null || guardando) return;
    setGuardando(true);
    try {
      await guardarActaMedidaProvisional(localId, {
        numeroCorrelativo,
        tipoMedida,
        descripcion,
        lugarEjecucion,
        observacionesAdministrado,
        seEjecutoEnActo,
      });
      setNumeroCorrelativo('');
      setTipoMedida(null);
      setSeEjecutoEnActo(null);
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

      <div className={formGroup}>
        <label className={cn(formLabel, formLabelRequired)}>Tipo de medida provisional</label>
        <div className={cn(optionsGrid, 'mb-0!')}>
          {OPCIONES.map((opcion) => {
            const isSelected = tipoMedida === opcion.valor;
            return (
              <div
                key={opcion.valor}
                className={cn(optionCard(isSelected), 'py-[0.625rem]! px-[0.875rem]!')}
                onClick={() => setTipoMedida(opcion.valor)}
                role="button"
                tabIndex={0}
              >
                <div className={optionRadio(isSelected)}>
                  <div className={optionRadioDot(isSelected)} />
                </div>
                <div className={optionCardContent}>
                  <div className={optionCardTitle}>{opcion.etiqueta}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={formGroup}>
        <label className={cn(formLabel, formLabelRequired)}>¿Se ejecutó la medida en el acto?</label>
        <div className={cn(optionsGrid, 'mb-0!')}>
          {OPCIONES_EJECUCION.map((opcion) => {
            const isSelected = seEjecutoEnActo === opcion.valor;
            return (
              <div
                key={opcion.etiqueta}
                className={cn(optionCard(isSelected), 'py-[0.625rem]! px-[0.875rem]!')}
                onClick={() => setSeEjecutoEnActo(opcion.valor)}
                role="button"
                tabIndex={0}
              >
                <div className={optionRadio(isSelected)}>
                  <div className={optionRadioDot(isSelected)} />
                </div>
                <div className={optionCardContent}>
                  <div className={optionCardTitle}>{opcion.etiqueta}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className={cn(formHint, 'mt-[0.375rem]! mb-0!')}>
          Si no se ejecutó, se ejecutará después (p. ej. en vía coactiva).
        </p>
      </div>

      <div className={formGroup}>
        <label className={cn(formLabel, requiereDescripcion && formLabelRequired)}>
          Descripción {requiereDescripcion ? '(indica qué tipo de medida es)' : '(opcional)'}
        </label>
        <input
          type="text"
          className={formInput}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={requiereDescripcion ? 'Ej. Retiro del animal, cancelación de espectáculo público...' : 'Ej. Clausura temporal del establecimiento comercial'}
        />
      </div>

      <div className={formGroup}>
        <label className={formLabel}>Lugar de ejecución (opcional)</label>
        <input
          type="text"
          className={formInput}
          value={lugarEjecucion}
          onChange={(e) => setLugarEjecucion(e.target.value)}
          placeholder="Ej. Puerta de acceso principal"
        />
      </div>

      <div className={formGroup}>
        <label className={formLabel}>Observaciones formuladas por el administrado (opcional)</label>
        <textarea
          className={formTextarea}
          value={observacionesAdministrado}
          onChange={(e) => setObservacionesAdministrado(e.target.value)}
          rows={2}
          placeholder="Lo que manifiesta el administrado al momento de ejecutar la medida..."
        />
      </div>

      <AdjuntarFotoActa
        intervencionLocalId={localId}
        actaTipo="ACTA_MEDIDA_PROVISIONAL"
        obligatoria
        label="Foto del acta física de medida provisional"
        onCambio={setTieneFotoActa}
      />

      {seEjecutoEnActo === true && (
        <AdjuntarFotoActa
          intervencionLocalId={localId}
          actaTipo="MEDIDA_PROVISIONAL_EJECUCION"
          obligatoria
          label="Foto de la medida ejecutada"
          onCambio={setTieneFotoEjecucion}
          textoBotonCamara="Tomar foto de la medida"
          altFoto="Medida provisional ejecutada"
        />
      )}

      <button
        type="button"
        className={cn(btn('primary', { block: true }), 'mt-[0.75rem]!')}
        onClick={handleGuardar}
        disabled={!puedeGuardar || guardando}
      >
        {guardando ? 'Guardando…' : 'Guardar Medida Provisional'}
      </button>
    </div>
  );
}
