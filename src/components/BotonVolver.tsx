import { btnBack } from '../lib/ui';

/** HU-19: navegación hacia atrás del wizard, sin perder lo ya guardado (cada pantalla precarga su valor). */
interface Props {
  onVolver: () => void;
  disabled?: boolean;
}

export default function BotonVolver({ onVolver, disabled }: Props) {
  return (
    <button type="button" onClick={onVolver} disabled={disabled} className={btnBack}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>Volver</span>
    </button>
  );
}
