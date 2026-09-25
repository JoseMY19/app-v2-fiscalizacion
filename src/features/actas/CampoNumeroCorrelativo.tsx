import { textoEstadoCorrelativo, type EstadoCorrelativo } from './useVerificacionCorrelativo';
import { cn } from '../../lib/cn';
import { badge, formGroup, formHint, formInput, formLabel, formLabelRequired } from '../../lib/ui';

/** HU-16: input + estado de verificación de unicidad, reutilizado por todas las actas. */
interface Props {
  value: string;
  onChange: (value: string) => void;
  estado: EstadoCorrelativo;
}

export default function CampoNumeroCorrelativo({ value, onChange, estado }: Props) {
  const texto = textoEstadoCorrelativo(estado);

  const getBadgeClass = () => {
    switch (estado) {
      case 'disponible': return 'success' as const;
      case 'duplicado': return 'danger' as const;
      case 'verificando': return 'primary' as const;
      case 'sin_verificar': return 'warning' as const;
      default: return 'neutral' as const;
    }
  };

  return (
    <div className={formGroup}>
      <div className="flex items-center justify-between mb-[0.375rem]">
        <label className={cn(formLabel, formLabelRequired, 'mb-0!')}>
          N° correlativo físico
        </label>
        {texto && (
          <span className={badge(getBadgeClass())}>
            {texto}
          </span>
        )}
      </div>
      <input
        type="text"
        className={cn(formInput, estado === 'duplicado' && 'border-danger!', estado === 'disponible' && 'border-success!')}
        placeholder="Ej. 001254"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className={formHint}>Número pre-impreso en el talonario o formato físico oficial.</span>
    </div>
  );
}
