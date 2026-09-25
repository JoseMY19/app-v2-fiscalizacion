import { useEffect, useState } from 'react';
import { BaseCalculo, calcularMontoPasibleMulta } from '@pas-sjl/shared-types';
import { obtenerUitVigenteLocal, sincronizarParametrosUit, uitCacheEstaVacio } from './uit-cache.repository';
import { cn } from '../../lib/cn';
import { alerta, badge, btn, formGroup, formLabel, formLabelRequired, optionCard, optionCardContent, optionCardTitle, optionRadio, optionRadioDot, optionsGrid } from '../../lib/ui';

/**
 * HU-11/HU-13: baseCalculo lo elige el fiscalizador explícitamente, sin
 * preselección — ningún dato del catálogo CUIS dice hoy cuál aplica (ver
 * docs/cuis/reporte-calidad.md). El monto solo se calcula y persiste si
 * elige UIT_FIJO; para VALOR_OBRA/POR_VOLUMEN queda pendiente para SP5.
 */

const OPCIONES: { valor: BaseCalculo; etiqueta: string }[] = [
  { valor: BaseCalculo.UIT_FIJO, etiqueta: 'UIT fija' },
  { valor: BaseCalculo.VALOR_OBRA, etiqueta: 'Valor de obra' },
  // Pedido explícito de negocio (reunión 2026-09): "por volumen" no es una
  // forma de cálculo aparte, cae dentro de "Otros" — se deja BaseCalculo.
  // POR_VOLUMEN vivo en el enum (hay actas ya sincronizadas con ese valor,
  // nunca se tocan datos ya guardados) pero ya no se ofrece como opción
  // nueva.
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
    <div className={cn(formGroup, 'mb-[1.25rem]!')}>
      <label className={cn(formLabel, formLabelRequired)}>Base de cálculo</label>

      <div className={cn(optionsGrid, 'mb-[0.75rem]!')}>
        {OPCIONES.map((opcion) => {
          const isSelected = baseCalculo === opcion.valor;
          return (
            <div
              key={opcion.valor}
              className={cn(optionCard(isSelected), 'py-[0.625rem]! px-[0.875rem]!')}
              onClick={() => calcular(opcion.valor)}
              role="button"
              tabIndex={0}
            >
              <div className={optionRadio(isSelected)}>
                <div className={optionRadioDot(isSelected)} />
              </div>
              <div className={optionCardContent}>
                <div className={cn(optionCardTitle, 'text-[0.875rem]!')}>
                  {opcion.etiqueta}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {baseCalculo === BaseCalculo.UIT_FIJO && uitVacio && (
        <div className={alerta('warning')} role="alert">
          <div className="flex-1">
            <div className="font-semibold">Parámetro UIT no disponible</div>
            <p className="text-[0.8125rem] mb-[0.5rem]">
              El valor de la UIT vigente no está en el dispositivo. Si tienes conexión, sincronízalo ahora.
            </p>
            <button
              type="button"
              className={btn('primary', { tamano: 'sm' })}
              onClick={handleSincronizarUit}
              disabled={sincronizando}
            >
              {sincronizando ? 'Sincronizando…' : 'Sincronizar UIT'}
            </button>
            {error && <p role="alert" className="text-danger text-[0.75rem] mt-[0.25rem]">{error}</p>}
          </div>
        </div>
      )}

      {baseCalculo === BaseCalculo.UIT_FIJO && porcentajeUit === undefined && (
        <div className={alerta('warning')} role="alert">
          No se puede calcular automáticamente: el código seleccionado no cuenta con porcentaje UIT definido.
        </div>
      )}

      {baseCalculo && baseCalculo !== BaseCalculo.UIT_FIJO && (
        <div className={alerta('info')}>
          Cálculo no aplicable en campo: la cuantificación se determinará en gabinete (oficina técnica).
        </div>
      )}

      {baseCalculo === BaseCalculo.UIT_FIJO && monto !== null && (
        <div className="p-[1rem] bg-primary-50 border-[1.5px] border-solid border-primary-200 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[0.75rem] uppercase tracking-[0.05em] text-primary-800 font-semibold">
              Monto pasible de multa ({porcentajeUit}% UIT)
            </div>
            <div className="text-[1.375rem] font-bold text-primary-900 mt-[0.125rem]">
              S/ {monto.toFixed(2)}
            </div>
          </div>
          <span className={badge('primary')}>Cálculo Automático</span>
        </div>
      )}
    </div>
  );
}
