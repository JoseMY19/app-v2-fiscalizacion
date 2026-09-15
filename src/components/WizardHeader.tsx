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
    <div className="wizard-nav">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        {onVolver ? (
          <button
            type="button"
            className="btn-back"
            onClick={onVolver}
            disabled={deshabilitarVolver}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Volver</span>
          </button>
        ) : (
          <div />
        )}
        <span className="badge badge-primary">
          Paso {pasoActual} de {totalPasos}
        </span>
      </div>

      <div className="wizard-progress-bar-bg">
        <div className="wizard-progress-bar-fill" style={{ width: `${porcentaje}%` }} />
      </div>

      <div style={{ marginTop: '0.5rem' }}>
        <h1 className="wizard-step-title">{titulo}</h1>
        {subtitulo && <p className="form-hint" style={{ marginTop: '0.125rem' }}>{subtitulo}</p>}
      </div>
    </div>
  );
}
