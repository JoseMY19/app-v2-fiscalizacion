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
    <div className="bg-white border border-solid border-border rounded-lg px-[1.125rem] py-4 mb-4 shadow-xs relative z-[2]">
      {/* Fila superior: Botón Volver + Indicador de Paso + Porcentaje */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {onVolver ? (
          <button
            type="button"
            className="inline-flex items-center gap-[0.35rem] bg-bg-subtle border border-solid border-border rounded-pill px-3 py-[0.35rem] text-[0.8125rem] font-semibold text-text-body cursor-pointer transition-all duration-150 not-disabled:hover:bg-primary-50 not-disabled:hover:border-primary-200 not-disabled:hover:text-primary-700 not-disabled:active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed"
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

        <div className="flex items-center gap-[0.4rem]">
          <span className="text-xs font-bold text-primary-700 bg-primary-50 border border-solid border-primary-100 px-[0.6rem] py-1 rounded-pill tracking-[0.02em]">
            Paso {pasoActual} de {totalPasos}
          </span>
        </div>
      </div>

      {/* Barra de progreso con pista suave y relleno degradado */}
      <div className="w-full h-1.5 bg-border rounded-pill overflow-hidden mb-3.5">
        <div
          className="h-full bg-linear-to-r from-primary-600 to-primary-500 rounded-pill transition-[width] duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* Título del Paso y Descripción */}
      <div className="flex flex-col gap-[0.2rem]">
        <h1 className="text-lg font-extrabold text-primary-900 leading-tight m-0 tracking-[-0.01em]">{titulo}</h1>
        {subtitulo && <p className="text-[0.8125rem] text-text-muted m-0 leading-[1.35]">{subtitulo}</p>}
      </div>
    </div>
  );
}
