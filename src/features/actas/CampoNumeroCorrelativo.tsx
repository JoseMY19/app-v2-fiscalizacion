import { textoEstadoCorrelativo, type EstadoCorrelativo } from './useVerificacionCorrelativo';

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
      case 'disponible': return 'badge-success';
      case 'duplicado': return 'badge-danger';
      case 'verificando': return 'badge-primary';
      case 'sin_verificar': return 'badge-warning';
      default: return 'badge-neutral';
    }
  };

  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <label className="form-label form-label-required" style={{ marginBottom: 0 }}>
          N° correlativo físico
        </label>
        {texto && (
          <span className={`badge ${getBadgeClass()}`}>
            {texto}
          </span>
        )}
      </div>
      <input
        type="text"
        className={`form-input ${estado === 'duplicado' ? 'input-error' : ''}`}
        placeholder="Ej. 001254"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderColor: estado === 'duplicado' ? 'var(--color-danger)' : estado === 'disponible' ? 'var(--color-success)' : undefined,
        }}
      />
      <span className="form-hint">Número pre-impreso en el talonario o formato físico oficial.</span>
    </div>
  );
}
