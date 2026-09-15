import { useEffect, useState } from 'react';
import { listarCuisSeleccionadosConDetalle, type SeleccionCuisConDetalle } from './intervencion-cuis.repository';
import { etiquetaEscala } from './etiqueta-escala';

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
      <div style={{ padding: '0.75rem 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Cargando código CUIS…
      </div>
    );
  }

  if (seleccionados.length === 0) {
    return (
      <div className="alert alert-warning" role="alert">
        No hay ningún código CUIS seleccionado en esta intervención (ver HU-07).
      </div>
    );
  }

  if (seleccionados.length === 1) {
    const { codigo, escala } = seleccionados[0];
    return (
      <div className="card card--highlight" style={{ padding: '0.875rem 1rem', marginBottom: '1rem' }}>
        <span className="form-hint" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          Código CUIS Vinculado
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span className="badge badge-primary">{codigo.codigo}</span>
          {escala && (
            <span className="badge badge-neutral">
              {etiquetaEscala(escala.escala)} ({escala.porcentaje}% UIT)
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.875rem', marginTop: '0.375rem', marginBottom: 0, color: 'var(--color-text-body)' }}>
          {codigo.descripcion}
        </p>
      </div>
    );
  }

  return (
    <div className="form-group" style={{ marginBottom: '1rem' }}>
      <label className="form-label form-label-required">
        ¿A cuál de los códigos CUIS corresponde esta acta?
      </label>
      <div className="options-grid">
        {seleccionados.map((s) => {
          const isSelected = elegidoId === s.registro.id;
          return (
            <div
              key={s.registro.id}
              className={`option-card ${isSelected ? 'option-card--selected' : ''}`}
              onClick={() => {
                setElegidoId(s.registro.id);
                onElegido(s);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="option-radio">
                <div className="option-radio-dot" />
              </div>
              <div className="option-card-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-primary">{s.codigo.codigo}</span>
                  {s.escala && (
                    <span className="badge badge-neutral">
                      {etiquetaEscala(s.escala.escala)} ({s.escala.porcentaje}% UIT)
                    </span>
                  )}
                </div>
                <div className="option-card-desc" style={{ marginTop: '0.25rem' }}>
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
