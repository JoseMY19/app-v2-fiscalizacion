import { cn } from '../lib/cn';
import { tarjetaSuave } from '../lib/ui';

interface Props {
  pasoActual: number;
  totalPasos: number;
  titulo: string;
  subtitulo?: string;
  onVolver?: () => void;
  deshabilitarVolver?: boolean;
}

export default function WizardHeader({
  pasoActual,
  totalPasos,
  titulo,
  subtitulo,
  onVolver,
  deshabilitarVolver,
}: Props) {
  const porcentaje = Math.min(100, Math.max(0, Math.round((pasoActual / totalPasos) * 100)));

  return (
    <div className={cn(tarjetaSuave, 'px-4 py-4 mb-4')}>
      {/* Fila superior: Botón Volver + Indicador de Paso */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        {onVolver ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 bg-campo-50 border border-solid border-campo-100 rounded-pill pl-2.5 pr-3.5 py-1.5 text-[0.8125rem] font-semibold text-campo-700 cursor-pointer transition-all duration-150 not-disabled:hover:bg-campo-100 not-disabled:active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onVolver}
            disabled={deshabilitarVolver}
            aria-label="Volver al paso anterior"
            title="Volver"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Volver</span>
          </button>
        ) : (
          <div />
        )}

        <span className="text-xs font-semibold text-text-muted">
          Paso <span className="font-bold text-campo-700">{pasoActual}</span> de {totalPasos}
        </span>
      </div>

      {/* Barra de progreso con la franja multicolor SJL */}
      <div className="w-full h-2 bg-bg-subtle rounded-pill overflow-hidden mb-4">
        {/* backgroundSize estira la franja al ancho total: el avance "descubre" los colores en vez de comprimirlos */}
        <div
          className="h-full bg-franja-sjl rounded-pill transition-[width] duration-300"
          style={{ width: `${porcentaje}%`, backgroundSize: `${porcentaje > 0 ? 10000 / porcentaje : 100}% 100%` }}
        />
      </div>

      {/* Título del Paso y Descripción */}
      <div className="flex flex-col gap-1">
        <h1 className="font-titulo text-[1.375rem] font-black text-text-title leading-tight m-0">{titulo}</h1>
        {subtitulo && <p className="text-[0.8125rem] text-text-muted m-0 leading-[1.35]">{subtitulo}</p>}
      </div>
    </div>
  );
}
