import { useEffect, useState } from 'react';
import { BaseCalculo, calcularMontoPasibleMulta } from '@pas-sjl/shared-types';
import { obtenerUitVigenteLocal, sincronizarParametrosUit, uitCacheEstaVacio } from './uit-cache.repository';

/**
 * HU-11/HU-13: baseCalculo lo elige el fiscalizador explícitamente, sin
 * preselección — ningún dato del catálogo CUIS dice hoy cuál aplica (ver
 * docs/cuis/reporte-calidad.md). El monto solo se calcula y persiste si
 * elige UIT_FIJO; para VALOR_OBRA/POR_VOLUMEN queda pendiente para SP5.
 */

const OPCIONES: { valor: BaseCalculo; etiqueta: string }[] = [
  { valor: BaseCalculo.UIT_FIJO, etiqueta: 'UIT fija' },
  { valor: BaseCalculo.VALOR_OBRA, etiqueta: 'Valor de obra' },
  { valor: BaseCalculo.POR_VOLUMEN, etiqueta: 'Por volumen' },
  // Pedido explícito de negocio (reunión 2026-09): puede haber ordenanzas
  // que calculen distinto a las 3 formas de arriba — nunca se fuerza un
  // default silencioso, el cálculo en ese caso queda para gabinete.
  { valor: BaseCalculo.OTROS, etiqueta: 'Otros' },
];

interface Props {
  porcentajeUit: number | undefined;
  fecha: Date;
  onResultado: (resultado: { baseCalculo: BaseCalculo; monto: number | null }) => void;
}

export default function SelectorBaseCalculoYMonto({ porcentajeUit, fecha, onResultado }: Props) {
  const [baseCalculo, setBaseCalculo] = useState<BaseCalculo | null>(null);
  const [monto, setMonto] = useState<number | null>(null);
  const [uitVacio, setUitVacio] = useState<boolean | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    uitCacheEstaVacio().then(setUitVacio);
  }, []);

  async function calcular(valor: BaseCalculo) {
    setBaseCalculo(valor);
    if (valor !== BaseCalculo.UIT_FIJO || porcentajeUit === undefined) {
      setMonto(null);
      onResultado({ baseCalculo: valor, monto: null });
      return;
    }
    const uit = await obtenerUitVigenteLocal(fecha);
    if (!uit) {
      setMonto(null);
      onResultado({ baseCalculo: valor, monto: null });
      return;
    }
    const calculado = calcularMontoPasibleMulta(porcentajeUit, uit.valorSoles);
    setMonto(calculado);
    onResultado({ baseCalculo: valor, monto: calculado });
  }

  async function handleSincronizarUit() {
    setSincronizando(true);
    setError(null);
    try {
      await sincronizarParametrosUit();
      setUitVacio(false);
      if (baseCalculo) await calcular(baseCalculo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo sincronizar la UIT.');
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
      <label className="form-label form-label-required">Base de cálculo</label>

      <div className="options-grid" style={{ marginBottom: '0.75rem' }}>
        {OPCIONES.map((opcion) => {
          const isSelected = baseCalculo === opcion.valor;
          return (
            <div
              key={opcion.valor}
              className={`option-card ${isSelected ? 'option-card--selected' : ''}`}
              onClick={() => calcular(opcion.valor)}
              role="button"
              tabIndex={0}
              style={{ padding: '0.625rem 0.875rem' }}
            >
              <div className="option-radio">
                <div className="option-radio-dot" />
              </div>
              <div className="option-card-content">
                <div className="option-card-title" style={{ fontSize: '0.875rem' }}>
                  {opcion.etiqueta}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {baseCalculo === BaseCalculo.UIT_FIJO && uitVacio && (
        <div className="alert alert-warning" role="alert">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Parámetro UIT no disponible</div>
            <p style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              El valor de la UIT vigente no está en el dispositivo. Si tienes conexión, sincronízalo ahora.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleSincronizarUit}
              disabled={sincronizando}
            >
              {sincronizando ? 'Sincronizando…' : 'Sincronizar UIT'}
            </button>
            {error && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</p>}
          </div>
        </div>
      )}

      {baseCalculo === BaseCalculo.UIT_FIJO && porcentajeUit === undefined && (
        <div className="alert alert-warning" role="alert">
          No se puede calcular automáticamente: el código seleccionado no cuenta con porcentaje UIT definido.
        </div>
      )}

      {baseCalculo && baseCalculo !== BaseCalculo.UIT_FIJO && (
        <div className="alert alert-info">
          Cálculo no aplicable en campo: la cuantificación se determinará en gabinete (oficina técnica).
        </div>
      )}

      {baseCalculo === BaseCalculo.UIT_FIJO && monto !== null && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-primary-50)',
            border: '1.5px solid var(--color-primary-200)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-800)', fontWeight: 600 }}>
              Monto pasible de multa ({porcentajeUit}% UIT)
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-primary-900)', marginTop: '0.125rem' }}>
              S/ {monto.toFixed(2)}
            </div>
          </div>
          <span className="badge badge-primary">Cálculo Automático</span>
        </div>
      )}
    </div>
  );
}
