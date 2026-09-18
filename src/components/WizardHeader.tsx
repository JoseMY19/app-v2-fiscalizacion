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
    <div className="wizard-card-header">
      {/* Fila superior: Botón Volver + Indicador de Paso + Porcentaje */}
      <div className="wizard-header-top">
        {onVolver ? (
          <button
            type="button"
            className="wizard-back-btn"
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

        <div className="wizard-step-indicators">
          <span className="wizard-step-badge">
            Paso {pasoActual} de {totalPasos}
          </span>
        </div>
      </div>

      {/* Barra de progreso con pista suave y relleno degradado */}
      <div className="wizard-progress-track">
        <div
          className="wizard-progress-fill"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* Título del Paso y Descripción */}
      <div className="wizard-title-block">
        <h1 className="wizard-step-title">{titulo}</h1>
        {subtitulo && <p className="wizard-step-sub">{subtitulo}</p>}
      </div>
    </div>
  );
}
