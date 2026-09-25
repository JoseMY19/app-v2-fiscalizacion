import { useEffect, useState } from 'react';
import { listarCuisSeleccionadosConDetalle, type SeleccionCuisConDetalle } from './intervencion-cuis.repository';
import { etiquetaEscala } from './etiqueta-escala';
import { cn } from '../../lib/cn';
import { alerta, badge, card, formGroup, formHint, formLabel, formLabelRequired, optionCard, optionCardContent, optionCardDesc, optionRadio, optionRadioDot, optionsGrid } from '../../lib/ui';

/**
 * HU-11/HU-13: "hereda automáticamente ... código CUIS ya capturado" — si
 * solo hay un código seleccionado (HU-07), se usa directo, sin pedir nada
 * (cero doble digitación). Si hay más de uno, el fiscalizador elige cuál
 * corresponde a esta acta — no hay forma automática de saber cuál aplica.
 */

interface Props {
  localId: string;
  onElegido: (seleccion: SeleccionCuisConDetalle | null) => void;
}

export default function SelectorCodigoParaActa({ localId, onElegido }: Props) {
  const [seleccionados, setSeleccionados] = useState<SeleccionCuisConDetalle[] | null>(null);
  const [elegidoId, setElegidoId] = useState<number | undefined>(undefined);

  useEffect(() => {
    listarCuisSeleccionadosConDetalle(localId).then((lista) => {
      setSeleccionados(lista);
      if (lista.length === 1) {
        setElegidoId(lista[0].registro.id);
        onElegido(lista[0]);
      } else {
        onElegido(null);
      }
    });
  }, [localId]);

  if (seleccionados === null) {
    return (
      <div className="py-[0.75rem] px-0 text-text-muted text-[0.875rem]">
        Cargando código CUIS…
      </div>
    );
  }

  if (seleccionados.length === 0) {
    return (
      <div className={alerta('warning')} role="alert">
        No hay ningún código CUIS seleccionado en esta intervención (ver HU-07).
      </div>
    );
  }

  if (seleccionados.length === 1) {
    const { codigo, escala } = seleccionados[0];
    return (
      <div className={cn(card('highlight'), 'py-[0.875rem]! px-[1rem]! mb-[1rem]!')}>
        <span className={cn(formHint, 'uppercase! tracking-[0.05em]! font-semibold!')}>
          Código CUIS Vinculado
        </span>
        <div className="flex items-center gap-[0.5rem] mt-[0.25rem]">
          <span className={badge('primary')}>{codigo.codigo}</span>
          {escala && (
            <span className={badge('neutral')}>
              {etiquetaEscala(escala.escala)} ({escala.porcentaje}% UIT)
            </span>
          )}
        </div>
        <p className="text-[0.875rem] mt-[0.375rem] mb-0 text-text-body">
          {codigo.descripcion}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(formGroup, 'mb-[1rem]!')}>
      <label className={cn(formLabel, formLabelRequired)}>
        ¿A cuál de los códigos CUIS corresponde esta acta?
      </label>
      <div className={optionsGrid}>
        {seleccionados.map((s) => {
          const isSelected = elegidoId === s.registro.id;
          return (
            <div
              key={s.registro.id}
              className={optionCard(isSelected)}
              onClick={() => {
                setElegidoId(s.registro.id);
                onElegido(s);
              }}
              role="button"
              tabIndex={0}
            >
              <div className={optionRadio(isSelected)}>
                <div className={optionRadioDot(isSelected)} />
              </div>
              <div className={optionCardContent}>
                <div className="flex items-center gap-[0.5rem]">
                  <span className={badge('primary')}>{s.codigo.codigo}</span>
                  {s.escala && (
                    <span className={badge('neutral')}>
                      {etiquetaEscala(s.escala.escala)} ({s.escala.porcentaje}% UIT)
                    </span>
                  )}
                </div>
                <div className={cn(optionCardDesc, 'mt-[0.25rem]!')}>
                  {s.codigo.descripcion}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
