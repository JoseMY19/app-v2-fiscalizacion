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
import { actionsFooter, alerta, appContainer, badge, btn, card, customList, customListItem, customListItemHeader, formGroup, formHint, formInput, formLabel, optionCard, optionCardContent, optionCardDesc, optionCardTitle, optionsGrid } from '../../lib/ui';
import { cn } from '../../lib/cn';

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
      <div className={appContainer}>
        <div className={cn(card(), 'border-t-[4px]! border-solid! border-t-primary-600!')}>
          <div className="mb-[1rem]">
            <span className={cn(badge('primary'), 'text-[0.875rem]! mb-[0.375rem]!')}>
              Código {codigoPendienteDeEscala.codigo}
            </span>
            <h2 className="text-[1.125rem] mt-[0.25rem]">Seleccionar Escala de Gravedad</h2>
            <p className="text-[0.875rem] text-text-muted">
              {codigoPendienteDeEscala.descripcion}
            </p>
          </div>

          <div className={alerta('info')}>
            Este código cuenta con múltiples condiciones tarifarias. Selecciona la escala correspondiente al hecho constatado:
          </div>

          <div className={optionsGrid}>
            {codigoPendienteDeEscala.escalas.map((escala) => (
              <div
                key={escala.id}
                className={optionCard(false)}
                onClick={() => handleConfirmarEscala(codigoPendienteDeEscala, escala)}
                role="button"
                tabIndex={0}
              >
                <div className={optionCardContent}>
                  <div className="flex items-center justify-between gap-[0.5rem]">
                    <span className={optionCardTitle}>{etiquetaEscala(escala.escala)}</span>
                    <span className={badge('primary')}>{escala.porcentaje}% UIT</span>
                  </div>
                  {escala.condicion && (
                    <div className={cn(optionCardDesc, 'mt-[0.25rem]!')}>
                      {escala.condicion}
                    </div>
                  )}
                  {escala.medidaProvisional && (
                    <div className="text-[0.75rem] text-warning mt-[0.25rem]">
                      Medida prov.: {escala.medidaProvisional}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={cn(btn('secondary', { block: true }), 'mt-[0.75rem]!')}
            onClick={() => setCodigoPendienteDeEscala(null)}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={appContainer}>
      <WizardHeader
        pasoActual={4}
        totalPasos={8}
        titulo="Infracciones (CUIS)"
        subtitulo="Cuadro Único de Infracciones y Sanciones de la MDSJL"
        onVolver={onVolver}
      />

      {catalogoVacio && (
        <div className={alerta('warning')} role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex-1">
            <div className="font-semibold">Catálogo local vacío</div>
            <p className="text-[0.8125rem] mb-[0.5rem]">
              El catálogo CUIS aún no se ha descargado a este dispositivo. Si tienes conexión, sincronízalo ahora.
            </p>
            <button
              type="button"
              className={btn('primary', { tamano: 'sm' })}
              onClick={handleSincronizar}
              disabled={sincronizando}
            >
              {sincronizando ? 'Sincronizando…' : 'Descargar catálogo CUIS'}
            </button>
            {errorSync && <p role="alert" className="text-danger text-[0.75rem] mt-[0.25rem]">{errorSync}</p>}
          </div>
        </div>
      )}

      {/* Buscador de Infracciones */}
      <div className={card()}>
        <div className={cn(formGroup, 'mb-0!')}>
          <label className={formLabel}>Buscar por código o descripción</label>
          <div className="relative">
            <input
              type="text"
              className={cn(formInput, 'pl-[2.25rem]!')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. 7.01.06, residuos, ruidos, licencia…"
            />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2" className="absolute left-[0.75rem] top-[50%] -translate-y-1/2 text-text-muted">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {query.trim().length > 0 && (
          <div className="mt-[0.75rem]">
            <span className={cn(formHint, 'block! mb-[0.5rem]!')}>
              Resultados encontrados ({resultados.length})
            </span>
            {resultados.length === 0 ? (
              <p className="text-[0.875rem] text-text-muted text-center py-[1rem] px-0">
                No se encontraron códigos que coincidan con "{query}".
              </p>
            ) : (
              <ul className={cn(customList, 'max-h-[260px]! overflow-y-auto!')}>
                {resultados.map((r) => (
                  <li key={r.id} className={customListItem}>
                    <div className={customListItemHeader}>
                      <span className={badge('primary')}>{r.codigo}</span>
                      <button
                        type="button"
                        className={btn('outline', { tamano: 'sm' })}
                        onClick={() => handleElegir(r)}
                      >
                        + Agregar
                      </button>
                    </div>
                    <p className="text-[0.8125rem] mb-0 text-text-body">
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
      <div className={card()}>
        <div className="flex items-center justify-between mb-[0.75rem]">
          <h2 className="text-[1rem] m-0">
            Infracciones seleccionadas
          </h2>
          <span className={badge(seleccionados.length > 0 ? 'success' : 'neutral')}>
            {seleccionados.length} código(s)
          </span>
        </div>

        {seleccionados.length === 0 ? (
          <p className="text-[0.875rem] text-text-muted mb-0 py-[0.5rem] px-0">
            Todavía no has seleccionado ningún código de infracción. Puedes buscar en el catálogo arriba.
          </p>
        ) : (
          <ul className={customList}>
            {seleccionados.map(({ registro, codigo, escala }) => (
              <li key={registro.id} className={cn(customListItem, 'border-l-[3px]! border-solid! border-l-primary-600!')}>
                <div className={customListItemHeader}>
                  <div className="flex items-center gap-[0.5rem]">
                    <span className={badge('primary')}>{codigo.codigo}</span>
                    {escala && (
                      <span className={badge('neutral')}>
                        {etiquetaEscala(escala.escala)} ({escala.porcentaje}% UIT)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={btn('danger', { tamano: 'sm' })}
                    onClick={() => handleQuitar(registro.id)}
                  >
                    Quitar
                  </button>
                </div>

                <div className="text-[0.875rem] text-text-body">
                  {codigo.descripcion}
                </div>

                {escala && (
                  <div className="text-[0.75rem] text-text-muted">
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

      <div className={actionsFooter}>
        <button
          type="button"
          className={btn('primary', { tamano: 'lg', block: true })}
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
