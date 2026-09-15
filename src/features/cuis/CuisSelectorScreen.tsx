import { useEffect, useState } from 'react';
import {
  buscarCuisLocal,
  catalogoLocalEstaVacio,
  sincronizarCatalogoCuis,
  type CuisCodigoLocal,
  type EscalaCuisLocal,
} from './cuis-catalogo.repository';
import {
  agregarCuisSeleccionado,
  listarCuisSeleccionadosConDetalle,
  quitarCuisSeleccionado,
  type SeleccionCuisConDetalle,
} from './intervencion-cuis.repository';
import { etiquetaEscala } from './etiqueta-escala';

/**
 * HU-07 — Seleccionar código de infracción (CUIS).
 * Criterios: buscador por código o texto; catálogo completo disponible
 * offline (precargado); permite seleccionar más de un código.
 *
 * HU-08 — Autocompletar datos según el código seleccionado.
 * Criterios: al elegir un código se muestran (solo lectura) descripción,
 * escala real (ver etiqueta-escala.ts sobre "nivel de riesgo"), % UIT y si
 * lleva medida provisional. "Medida complementaria" y "plazo de
 * subsanación" quedan fuera por las razones documentadas en la sesión de
 * implementación (dato no confiable / no pertenece al catálogo CUIS).
 */

import WizardHeader from '../../components/WizardHeader';

interface Props {
  localId: string;
  onContinuar: () => void;
  onVolver: () => void;
}

export default function CuisSelectorScreen({ localId, onContinuar, onVolver }: Props) {
  const [catalogoVacio, setCatalogoVacio] = useState<boolean | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [errorSync, setErrorSync] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<CuisCodigoLocal[]>([]);
  const [codigoPendienteDeEscala, setCodigoPendienteDeEscala] = useState<CuisCodigoLocal | null>(null);

  const [seleccionados, setSeleccionados] = useState<SeleccionCuisConDetalle[]>([]);

  async function cargarSeleccionados() {
    setSeleccionados(await listarCuisSeleccionadosConDetalle(localId));
  }

  useEffect(() => {
    catalogoLocalEstaVacio().then(setCatalogoVacio);
    cargarSeleccionados();
  }, [localId]);

  useEffect(() => {
    buscarCuisLocal(query).then(setResultados);
  }, [query]);

  async function handleSincronizar() {
    setSincronizando(true);
    setErrorSync(null);
    try {
      const total = await sincronizarCatalogoCuis();
      setCatalogoVacio(total === 0);
    } catch (e) {
      setErrorSync(e instanceof Error ? e.message : 'No se pudo sincronizar. Revisa tu conexión.');
    } finally {
      setSincronizando(false);
    }
  }

  async function handleElegir(codigo: CuisCodigoLocal) {
    if (codigo.escalas.length > 1) {
      setCodigoPendienteDeEscala(codigo);
      return;
    }
    await agregarCuisSeleccionado(localId, codigo.id, codigo.escalas[0]?.id);
    await cargarSeleccionados();
  }

  async function handleConfirmarEscala(codigo: CuisCodigoLocal, escala: EscalaCuisLocal) {
    await agregarCuisSeleccionado(localId, codigo.id, escala.id);
    setCodigoPendienteDeEscala(null);
    await cargarSeleccionados();
  }

  async function handleQuitar(id?: number) {
    if (id === undefined) return;
    await quitarCuisSeleccionado(id);
    await cargarSeleccionados();
  }

  if (codigoPendienteDeEscala) {
    return (
      <div className="app-container">
        <div className="card" style={{ borderTop: '4px solid var(--color-primary-600)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.875rem', marginBottom: '0.375rem' }}>
              Código {codigoPendienteDeEscala.codigo}
            </span>
            <h2 style={{ fontSize: '1.125rem', marginTop: '0.25rem' }}>Seleccionar Escala de Gravedad</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {codigoPendienteDeEscala.descripcion}
            </p>
          </div>

          <div className="alert alert-info">
            Este código cuenta con múltiples condiciones tarifarias. Selecciona la escala correspondiente al hecho constatado:
          </div>

          <div className="options-grid">
            {codigoPendienteDeEscala.escalas.map((escala) => (
              <div
                key={escala.id}
                className="option-card"
                onClick={() => handleConfirmarEscala(codigoPendienteDeEscala, escala)}
                role="button"
                tabIndex={0}
              >
                <div className="option-card-content">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span className="option-card-title">{etiquetaEscala(escala.escala)}</span>
                    <span className="badge badge-primary">{escala.porcentaje}% UIT</span>
                  </div>
                  {escala.condicion && (
                    <div className="option-card-desc" style={{ marginTop: '0.25rem' }}>
                      {escala.condicion}
                    </div>
                  )}
                  {escala.medidaProvisional && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                      Medida prov.: {escala.medidaProvisional}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => setCodigoPendienteDeEscala(null)}
            style={{ marginTop: '0.75rem' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <WizardHeader
        pasoActual={4}
        totalPasos={8}
        titulo="Infracciones (CUIS)"
        subtitulo="Cuadro Único de Infracciones y Sanciones de la MDSJL"
        onVolver={onVolver}
      />

      {catalogoVacio && (
        <div className="alert alert-warning" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Catálogo local vacío</div>
            <p style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              El catálogo CUIS aún no se ha descargado a este dispositivo. Si tienes conexión, sincronízalo ahora.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleSincronizar}
              disabled={sincronizando}
            >
              {sincronizando ? 'Sincronizando…' : 'Descargar catálogo CUIS'}
            </button>
            {errorSync && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errorSync}</p>}
          </div>
        </div>
      )}

      {/* Buscador de Infracciones */}
      <div className="card">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Buscar por código o descripción</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. 7.01.06, residuos, ruidos, licencia…"
              style={{ paddingLeft: '2.25rem' }}
            />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {query.trim().length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <span className="form-hint" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Resultados encontrados ({resultados.length})
            </span>
            {resultados.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No se encontraron códigos que coincidan con "{query}".
              </p>
            ) : (
              <ul className="custom-list" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                {resultados.map((r) => (
                  <li key={r.id} className="custom-list-item">
                    <div className="custom-list-item-header">
                      <span className="badge badge-primary">{r.codigo}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => handleElegir(r)}
                      >
                        + Agregar
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8125rem', marginBottom: 0, color: 'var(--color-text-body)' }}>
                      {r.descripcion ?? '(Sin descripción detallada)'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Códigos Seleccionados */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>
            Infracciones seleccionadas
          </h2>
          <span className={`badge ${seleccionados.length > 0 ? 'badge-success' : 'badge-neutral'}`}>
            {seleccionados.length} código(s)
          </span>
        </div>

        {seleccionados.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 0, padding: '0.5rem 0' }}>
            Todavía no has seleccionado ningún código de infracción. Puedes buscar en el catálogo arriba.
          </p>
        ) : (
          <ul className="custom-list">
            {seleccionados.map(({ registro, codigo, escala }) => (
              <li key={registro.id} className="custom-list-item" style={{ borderLeft: '3px solid var(--color-primary-600)' }}>
                <div className="custom-list-item-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-primary">{codigo.codigo}</span>
                    {escala && (
                      <span className="badge badge-neutral">
                        {etiquetaEscala(escala.escala)} ({escala.porcentaje}% UIT)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => handleQuitar(registro.id)}
                  >
                    Quitar
                  </button>
                </div>

                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-body)' }}>
                  {codigo.descripcion}
                </div>

                {escala && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {escala.condicion && <div><strong>Condición:</strong> {escala.condicion}</div>}
                    <div>
                      <strong>Medida provisional:</strong> {escala.medidaProvisional ?? 'No aplica'}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="actions-footer">
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={onContinuar}
        >
          <span>Continuar</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
