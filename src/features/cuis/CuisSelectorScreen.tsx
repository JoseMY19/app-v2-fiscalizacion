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
  listarCuisHuerfanos,
  listarCuisSeleccionadosConDetalle,
  quitarCuisSeleccionado,
  type SeleccionCuisConDetalle,
} from './intervencion-cuis.repository';
import { etiquetaEscala } from './etiqueta-escala';
import type { IntervencionCuisLocal } from '../../lib/db';

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
import { alerta, appContainer, btnCampo, btnCampoSecundario, campoRelleno, campoRellenoIcono, campoRellenoInput, iconoTarjeta, tarjetaSuave } from '../../lib/ui';
import { cn } from '../../lib/cn';

// Código CUIS como etiqueta magenta (en resultados y seleccionados).
const chipCodigo =
  'inline-flex items-center px-2.5 py-1 rounded-pill bg-campo-50 border border-solid border-campo-100 text-campo-700 text-xs font-bold tracking-[0.02em] whitespace-nowrap';
const chipEscala = 'inline-flex items-center px-2 py-0.5 rounded-pill text-[0.6875rem] font-bold whitespace-nowrap border border-solid';
// Color por gravedad real del catálogo (L/G/MG).
const COLOR_ESCALA: Record<EscalaCuisLocal['escala'], string> = {
  L: 'bg-success-bg border-success-border text-success',
  G: 'bg-warning-bg border-warning-border text-warning',
  MG: 'bg-danger-bg border-danger-border text-danger',
};
const btnQuitar =
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-transparent border border-solid border-danger-border text-danger text-xs font-semibold cursor-pointer shrink-0 ' +
  'transition-colors duration-150 hover:bg-danger-bg';
const btnAgregar =
  'inline-flex items-center gap-1 px-3 py-1.5 rounded-pill bg-linear-135 from-campo-700 to-campo-900 border-none text-white text-xs font-bold cursor-pointer shrink-0 ' +
  'shadow-[0_4px_10px_-4px_rgba(101,10,64,0.5)] transition-transform duration-150 active:scale-95';

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
  const [huerfanos, setHuerfanos] = useState<IntervencionCuisLocal[]>([]);

  async function cargarSeleccionados() {
    setSeleccionados(await listarCuisSeleccionadosConDetalle(localId));
    setHuerfanos(await listarCuisHuerfanos(localId));
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
        <div className={cn(tarjetaSuave, 'p-4')}>
          <span className={chipCodigo}>Código {codigoPendienteDeEscala.codigo}</span>
          <h2 className="font-titulo text-[1.25rem] font-black text-text-title leading-tight mt-2.5 mb-1">
            Seleccionar escala de gravedad
          </h2>
          <p className="text-[0.8125rem] text-text-muted mb-4">{codigoPendienteDeEscala.descripcion}</p>

          <div className={cn(alerta('info'), 'rounded-[14px] bg-campo-50! border-campo-100! text-campo-800!')}>
            Este código cuenta con múltiples condiciones tarifarias. Selecciona la escala correspondiente al hecho constatado.
          </div>

          <div className="flex flex-col gap-2.5">
            {codigoPendienteDeEscala.escalas.map((escala) => (
              <button
                key={escala.id}
                type="button"
                className="w-full text-left px-3.5 py-3 rounded-[16px] border-[1.5px] border-solid border-border bg-white cursor-pointer transition-[border-color,background-color] duration-150 hover:border-campo-200 hover:bg-campo-50/40 active:scale-[0.99]"
                onClick={() => handleConfirmarEscala(codigoPendienteDeEscala, escala)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(chipEscala, COLOR_ESCALA[escala.escala])}>{etiquetaEscala(escala.escala)}</span>
                  <span className="text-[0.9375rem] font-bold text-campo-700">{escala.porcentaje}% UIT</span>
                </div>
                {escala.condicion && <div className="text-xs text-text-body mt-1.5 leading-snug">{escala.condicion}</div>}
                {escala.medidaProvisional && (
                  <div className="text-xs text-warning mt-1">Medida prov.: {escala.medidaProvisional}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 mt-6">
          <button type="button" className={btnCampoSecundario} onClick={() => setCodigoPendienteDeEscala(null)}>
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
        <div className={cn(tarjetaSuave, 'p-4 mb-4')} role="alert">
          <div className="flex items-start gap-3.5">
            <div className={cn(iconoTarjeta, 'bg-warning-bg text-warning')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.9375rem] font-bold text-text-title">Catálogo local vacío</div>
              <p className="text-xs text-text-muted mt-0.5 mb-0 leading-snug">
                El catálogo CUIS aún no se ha descargado a este dispositivo. Si tienes conexión, descárgalo ahora.
              </p>
            </div>
          </div>
          <button type="button" className={cn(btnCampo, 'min-h-11 text-sm mt-3.5')} onClick={handleSincronizar} disabled={sincronizando}>
            {sincronizando ? 'Descargando…' : 'Descargar catálogo CUIS'}
          </button>
          {errorSync && (
            <p role="alert" className="text-danger text-xs mt-2 mb-0">
              {errorSync}
            </p>
          )}
        </div>
      )}

      {/* Buscador de Infracciones */}
      <div className={cn(tarjetaSuave, 'p-4 mb-4')}>
        <label className={campoRelleno} htmlFor="buscar-cuis">
          <span className={campoRellenoIcono}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            id="buscar-cuis"
            type="search"
            className={cn(campoRellenoInput, 'text-[0.9375rem]')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código o descripción: 7.01.06, ruidos…"
          />
        </label>

        {query.trim().length > 0 && (
          <div className="mt-3.5">
            <p className="text-[0.725rem] font-bold uppercase tracking-[0.06em] text-text-muted mb-2">
              {resultados.length} resultado{resultados.length === 1 ? '' : 's'}
            </p>
            {resultados.length === 0 ? (
              <p className="text-[0.8125rem] text-text-muted text-center py-4 m-0">
                No se encontraron códigos que coincidan con "{query}".
              </p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {resultados.map((r) => (
                  <li key={r.id} className="rounded-[14px] border border-solid border-border bg-white p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={chipCodigo}>{r.codigo}</span>
                      <button type="button" className={btnAgregar} onClick={() => handleElegir(r)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Agregar
                      </button>
                    </div>
                    <p className="text-[0.8125rem] m-0 text-text-body leading-snug">
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
      <div className={cn(tarjetaSuave, 'p-4')}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[0.9375rem] font-bold text-text-title m-0">Infracciones seleccionadas</h2>
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-pill text-xs font-bold',
              seleccionados.length > 0 ? 'bg-linear-135 from-campo-700 to-campo-900 text-white' : 'bg-bg-subtle text-text-muted',
            )}
          >
            {seleccionados.length}
          </span>
        </div>

        {huerfanos.length > 0 && (
          <div className="mb-3 p-3 rounded-[14px] border border-solid border-danger-border bg-danger-bg text-danger text-[0.8125rem]">
            <p className="m-0 mb-2">
              {huerfanos.length === 1 ? 'Un código de esta intervención' : `${huerfanos.length} códigos de esta intervención`} ya
              no existe en el catálogo actualizado. Quítalo y vuelve a elegirlo, si no el servidor rechazará la sincronización.
            </p>
            {huerfanos.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold">{h.codigoNormativo ? `Código ${h.codigoNormativo}` : 'Código desconocido'}</span>
                <button type="button" className={btnQuitar} onClick={() => handleQuitar(h.id)}>
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}

        {seleccionados.length === 0 ? (
          <div className="text-center py-5 px-2">
            <div className={cn(iconoTarjeta, 'w-12 h-12 rounded-full mx-auto mb-2.5 bg-campo-50 text-campo-700')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-text-title mb-0.5">Sin infracciones aún</p>
            <p className="text-xs text-text-muted m-0">Busca un código arriba y tócalo en "Agregar".</p>
          </div>
        ) : (
          <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
            {seleccionados.map(({ registro, codigo, escala }) => (
              <li
                key={registro.id}
                className="rounded-[14px] border border-solid border-campo-100 bg-campo-50/50 p-3 flex flex-col gap-2 border-l-4 border-l-campo-600"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className={chipCodigo}>{codigo.codigo}</span>
                    {escala && (
                      <span className={cn(chipEscala, COLOR_ESCALA[escala.escala])}>
                        {etiquetaEscala(escala.escala)} · {escala.porcentaje}% UIT
                      </span>
                    )}
                  </div>
                  <button type="button" className={btnQuitar} onClick={() => handleQuitar(registro.id)} aria-label={`Quitar código ${codigo.codigo}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                    Quitar
                  </button>
                </div>

                <div className="text-[0.8125rem] text-text-body leading-snug">{codigo.descripcion}</div>

                {escala && (
                  <div className="text-xs text-text-muted flex flex-col gap-0.5">
                    {escala.condicion && (
                      <div>
                        <span className="font-semibold text-text-body">Condición:</span> {escala.condicion}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-text-body">Medida provisional:</span> {escala.medidaProvisional ?? 'No aplica'}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2.5 mt-6">
        <button type="button" className={btnCampo} onClick={onContinuar}>
          <span>Continuar</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
