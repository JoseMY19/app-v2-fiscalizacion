import { useEffect, useState } from 'react';
import { TipoActuacion } from '@pas-sjl/shared-types';
import NuevaIntervencionWizard from './features/nueva-intervencion/NuevaIntervencionWizard';
import LoginScreen from './features/auth/LoginScreen';
import { obtenerFiscalizadorActivo } from './features/auth/auth.repository';
import { contarPendientes } from './features/sincronizacion/sync-cola.repository';
import { escanearYSincronizar, iniciarMotorSincronizacion } from './features/sincronizacion/motor-sincronizacion';
import { suscribirseACambiosSync, suscribirseASesionExpirada } from './features/sincronizacion/sync-eventos';
import ObservadasScreen from './features/correccion/ObservadasScreen';
import { listarObservadas } from './features/correccion/intervenciones-observadas.repository';
import MisTramitesScreen from './features/mis-tramites/MisTramitesScreen';
import { socket } from './lib/socket';

import AppHeader from './components/AppHeader';
import BottomNavBar from './components/BottomNavBar';
import { cn } from './lib/cn';
import { alerta, appContainer, badge, btn, card, kpiChip } from './lib/ui';

// Botón outline con texto/borde de peligro fijos (antes inline style, que
// ganaba también sobre el hover).
const btnCerrarSesion =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-md border border-solid cursor-pointer select-none w-full ' +
  'px-[1.125rem] py-2.5 text-[0.9375rem] min-h-11 bg-white text-danger border-danger-border not-disabled:hover:bg-primary-50 ' +
  'transition-[background-color,border-color,box-shadow,transform] duration-150 not-disabled:active:scale-[0.98]';

const kpiCardBase =
  'bg-white border border-solid rounded-lg pt-3.5 px-3.5 pb-3 flex flex-col justify-between shadow-xs transition-all duration-150 text-left cursor-pointer relative z-[2] min-h-[98px] hover:border-primary-300 hover:shadow-sm active:scale-[0.97]';
const kpiTop = 'flex items-center justify-between mb-2.5';
const kpiIcon = 'w-[34px] h-[34px] rounded-md flex items-center justify-center shrink-0';
const kpiBody = 'flex flex-col gap-0.5';
const kpiLabel = 'text-[0.8125rem] font-bold text-text-title leading-tight';
const kpiDetail = 'text-xs text-text-muted leading-[1.2]';

const menuItem =
  'flex items-center gap-3 px-4 py-3.5 bg-transparent border-0 border-b border-solid border-border last:border-b-0 w-full text-left text-inherit transition-colors duration-150';
const menuItemIcon = 'w-9 h-9 rounded-md flex items-center justify-center shrink-0';
const menuItemContent = 'flex-1 min-w-0';
const menuItemTitle = 'text-sm font-bold text-text-title';
const menuItemDesc = 'text-xs text-text-muted whitespace-nowrap overflow-hidden text-ellipsis';

type Vista =
  | { nombre: 'inicio' }
  | { nombre: 'nueva-intervencion' }
  | { nombre: 'observadas' }
  | { nombre: 'mis-tramites' }
  | { nombre: 'perfil' };

// Mismo mapeo que TipoActuacionScreen.tsx — nunca se muestra el enum crudo al usuario.
const TITULO_CAMINO: Record<string, string> = {
  [TipoActuacion.EXHORTACION]: 'Solo Exhortación',
  [TipoActuacion.CONSTATACION]: 'Solo Constatación',
  [TipoActuacion.INICIA_PAS]: 'Inicia PAS',
};

// Feedback mínimo del criterio de HU-05 ("se marca visualmente ... como
// Pendiente de saneamiento") al volver al inicio tras finalizar el alta.
// El resumen completo con todo lo capturado es HU-19 (dentro del wizard).
interface UltimaIntervencion {
  localId: string;
  identificado: boolean;
  cerrada: boolean;
  camino: TipoActuacion;
}

export default function App() {
  const [vista, setVista] = useState<Vista>({ nombre: 'inicio' });
  const [pendientes, setPendientes] = useState<number>(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaIntervencion, setUltimaIntervencion] = useState<UltimaIntervencion | null>(null);
  // HU-28: "¿hubo login alguna vez en este dispositivo?" — null mientras se
  // verifica, luego true/false. Deliberadamente NO pregunta si el access
  // token de ahora mismo es válido: la captura de campo es 100% local
  // (Dexie), así que un token vencido nunca debe tapar la app.
  const [tieneFiscalizador, setTieneFiscalizador] = useState<boolean | null>(null);
  const [fiscalizadorDni, setFiscalizadorDni] = useState<string | null>(null);
  // HU-29: aviso no bloqueante cuando el refresh token venció o fue
  // revocado — pausa la sincronización, nunca la captura. `mostrarLogin`
  // abre el formulario en un overlay SIN desmontar la vista de abajo (la
  // captura en curso, si la había, sigue intacta).
  const [sesionExpirada, setSesionExpirada] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  // V-02: si tiene valor, el wizard se abre en modo edición sobre esta
  // intervención en vez de crear una nueva.
  const [corrigiendoLocalId, setCorrigiendoLocalId] = useState<string | null>(null);
  // V-01: contador informativo, no crítico — a diferencia de `pendientes`
  // (offline-safe, cuenta local), este requiere red. Si falla (sin señal),
  // simplemente no se muestra badge; nunca bloquea ni alerta.
  const [observadasCount, setObservadasCount] = useState<number | null>(null);

  useEffect(() => {
    const fiscalizador = obtenerFiscalizadorActivo();
    setTieneFiscalizador(fiscalizador !== null);
    setFiscalizadorDni(fiscalizador);
  }, []);

  useEffect(() => {
    return suscribirseASesionExpirada(() => setSesionExpirada(true));
  }, []);

  // HU-24: arranca el motor una sola vez (auto-escanea al cargar la app y
  // cuando vuelve la conexión). HU-25: el badge se refresca solo con el
  // evento de cambio, sin hacer polling.
  useEffect(() => {
    if (!tieneFiscalizador) return;
    iniciarMotorSincronizacion();
    contarPendientes().then(setPendientes);
    // Canal adicional de aviso en vivo (RealtimeGateway) — jamás el
    // transporte de sincronización, que sigue siendo el motor de arriba.
    socket.connect();
    return suscribirseACambiosSync(() => {
      contarPendientes().then(setPendientes);
    });
  }, [tieneFiscalizador]);

  // V-01: una sola consulta al cargar — no hay evento local que avise de
  // observaciones nuevas (pasan del lado del validador, no de este
  // dispositivo), así que no tiene sentido resuscribirse a nada acá.
  useEffect(() => {
    if (!tieneFiscalizador) return;
    listarObservadas()
      .then((lista) => setObservadasCount(lista.length))
      .catch(() => setObservadasCount(null));
  }, [tieneFiscalizador]);

  // HU-27: avisa (no bloquea) si intenta cerrar/salir con pendientes > 0.
  // `pendientes` ya cuenta CONFLICTO — ver contarPendientes(). Limitación
  // conocida: en PWA instalada en iOS/Android, cerrar por el gesto del
  // sistema (swipe del app-switcher) no siempre dispara beforeunload; es
  // confiable en navegador de escritorio y parcialmente en móvil.
  useEffect(() => {
    function avisarSiHayPendientes(evento: BeforeUnloadEvent) {
      if (pendientes > 0) {
        evento.preventDefault();
        evento.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', avisarSiHayPendientes);
    return () => window.removeEventListener('beforeunload', avisarSiHayPendientes);
  }, [pendientes]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [vista.nombre]);

  async function handleSincronizarAhora() {
    setSincronizando(true);
    try {
      await escanearYSincronizar(true);
    } finally {
      setSincronizando(false);
    }
  }

  if (tieneFiscalizador === null) {
    return null; // evita parpadeo mientras se lee localStorage
  }

  if (!tieneFiscalizador) {
    return <LoginScreen onListo={() => {
      const f = obtenerFiscalizadorActivo();
      setTieneFiscalizador(true);
      setFiscalizadorDni(f);
    }} />;
  }

  const contenido =
    vista.nombre === 'nueva-intervencion' ? (
      <NuevaIntervencionWizard
        modoEdicion={corrigiendoLocalId !== null}
        localIdInicial={corrigiendoLocalId ?? undefined}
        onFinalizar={({ localId, identificado, cerrada, camino }) => {
          setUltimaIntervencion({ localId, identificado, cerrada, camino });
          setCorrigiendoLocalId(null);
          setVista({ nombre: 'inicio' });
          // Se acaba de resolver una observación — refresca el contador.
          listarObservadas()
            .then((lista) => setObservadasCount(lista.length))
            .catch(() => setObservadasCount(null));
        }}
        onCancelar={() => {
          setCorrigiendoLocalId(null);
          setVista({ nombre: 'inicio' });
        }}
      />
    ) : vista.nombre === 'observadas' ? (
      <ObservadasScreen
        onCorregir={(localId) => {
          setCorrigiendoLocalId(localId);
          setVista({ nombre: 'nueva-intervencion' });
        }}
        onVolver={() => setVista({ nombre: 'inicio' })}
      />
    ) : vista.nombre === 'mis-tramites' ? (
      <MisTramitesScreen onVolver={() => setVista({ nombre: 'inicio' })} />
    ) : vista.nombre === 'perfil' ? (
      <div className={appContainer}>
        <div className={cn(card(), 'p-6! text-center')}>
          <div className="w-14 h-14 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3.5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-lg mb-[0.2rem]">Inspector Municipal</h2>
          <p className="text-text-muted text-[0.8125rem] mb-5">
            Subgerencia de Operaciones de Fiscalización
          </p>

          <div className="text-left bg-bg-subtle rounded-md px-4 py-3.5 mb-5">
            <div className="flex justify-between mb-2 text-[0.8125rem]">
              <span className="text-text-muted">DNI / ID:</span>
              <span className="font-bold">{fiscalizadorDni ?? 'Sin asignar'}</span>
            </div>
            <div className="flex justify-between mb-2 text-[0.8125rem]">
              <span className="text-text-muted">Jurisdicción:</span>
              <span className="font-semibold">San Juan de Lurigancho</span>
            </div>
            <div className="flex justify-between text-[0.8125rem]">
              <span className="text-text-muted">Estado:</span>
              <span className="text-success font-bold">Activo en campo</span>
            </div>
          </div>

          <button
            type="button"
            className={btnCerrarSesion}
            onClick={() => {
              localStorage.removeItem('pas_sjl_fiscalizador_activo');
              setTieneFiscalizador(false);
            }}
          >
            Cerrar sesión en este dispositivo
          </button>
        </div>
      </div>
    ) : (
      <div className={appContainer}>
        {/* Identidad del Fiscalizador */}
        <div className="flex items-center gap-3 bg-white border border-solid border-border rounded-lg px-4 py-3 mb-4 shadow-xs relative z-[2]">
          <div className="w-[38px] h-[38px] rounded-md bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.7rem] font-semibold text-text-muted uppercase tracking-[0.04em] mb-[0.1rem]">Fiscalizador de Campo</div>
            <div className="text-[0.9375rem] font-bold text-text-title whitespace-nowrap overflow-hidden text-ellipsis">
              {fiscalizadorDni ? (fiscalizadorDni.includes('-') || fiscalizadorDni.length > 12 ? `ID #${fiscalizadorDni.slice(0, 8).toUpperCase()}` : `DNI ${fiscalizadorDni}`) : 'En servicio'}
            </div>
          </div>
          <div className="text-[0.6875rem] font-bold text-primary-700 bg-primary-50 border border-solid border-primary-100 px-2 py-[0.2rem] rounded-pill tracking-[0.05em] shrink-0">MDSJL</div>
        </div>

        {/* Tarjeta Hero Principal: Nueva Intervención */}
        <div className="bg-[linear-gradient(135deg,#102a71_0%,#1d3a8f_50%,#2851b3_100%)] rounded-xl px-5 py-[1.35rem] text-white shadow-[0_8px_24px_-4px_rgba(29,58,143,0.35)] mb-5 relative overflow-hidden border border-solid border-white/15 after:content-[''] after:absolute after:-top-[30px] after:-right-[30px] after:w-[130px] after:h-[130px] after:rounded-full after:bg-[radial-gradient(circle,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0)_70%)] after:pointer-events-none">
          <div className="inline-flex items-center gap-[0.35rem] px-[0.65rem] py-1 rounded-pill bg-white/20 text-white text-[0.725rem] font-bold uppercase tracking-[0.05em] mb-2.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Operaciones de Campo</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mb-[0.35rem] tracking-[-0.02em]">Nueva Fiscalización</h2>
          <p className="text-[0.8125rem] text-white/90 mb-[1.125rem] leading-[1.4]">
            Registro de actas, evidencias y firma digital en campo
          </p>
          <button
            type="button"
            className="bg-white text-primary-700 font-bold text-[0.9375rem] px-5 py-[0.8125rem] rounded-lg flex items-center justify-center gap-2 border-none cursor-pointer shadow-[0_4px_14px_rgba(16,42,113,0.25)] transition-[transform,box-shadow] duration-150 w-full active:scale-[0.98]"
            onClick={() => setVista({ nombre: 'nueva-intervencion' })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Iniciar Intervención</span>
          </button>
        </div>

        {/* Grilla 2x2 de Indicadores Rápidos */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* KPI 1: Sincronización */}
          <button
            type="button"
            className={cn(kpiCardBase, 'border-border')}
            onClick={handleSincronizarAhora}
            disabled={sincronizando}
            title="Tocar para forzar sincronización"
          >
            <div className={kpiTop}>
              <div className={cn(kpiIcon, 'bg-primary-50 text-primary-700')}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className={sincronizando ? 'animate-spin' : undefined}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </div>
              <span className={kpiChip(pendientes > 0 ? 'warning' : 'success')}>
                {pendientes > 0 ? `${pendientes} pend.` : 'Al día'}
              </span>
            </div>
            <div className={kpiBody}>
              <div className={kpiLabel}>Sincronización</div>
              <div className={kpiDetail}>
                {sincronizando ? 'Sincronizando…' : pendientes > 0 ? 'Tocar para enviar' : 'Expedientes al día'}
              </div>
            </div>
          </button>

          {/* KPI 2: Intervenciones Observadas */}
          <button
            type="button"
            className={cn(kpiCardBase, observadasCount && observadasCount > 0 ? 'border-warning-border' : 'border-border')}
            onClick={() => setVista({ nombre: 'observadas' })}
            title="Ver intervenciones observadas"
          >
            <div className={kpiTop}>
              <div className={cn(kpiIcon, observadasCount && observadasCount > 0 ? 'bg-warning-bg text-warning' : 'bg-bg-subtle text-text-muted')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              {observadasCount && observadasCount > 0 ? (
                <span className={kpiChip('warning')}>
                  {observadasCount} por revisar
                </span>
              ) : (
                <span className={kpiChip('neutral')}>
                  0 casos
                </span>
              )}
            </div>
            <div className={kpiBody}>
              <div className={kpiLabel}>Observadas</div>
              <div className={kpiDetail}>
                {observadasCount && observadasCount > 0 ? 'Requiere corrección' : 'Sin observaciones'}
              </div>
            </div>
          </button>
        </div>

        {/* Menú de Gestión Móvil */}
        <div className="bg-bg-card border border-solid border-border rounded-xl overflow-hidden shadow-sm mb-5">
          <div className="text-[0.725rem] font-bold uppercase tracking-[0.06em] text-text-muted pt-3.5 px-4 pb-[0.4rem]">Gestión y Expedientes</div>

          <button
            type="button"
            className={cn(menuItem, 'cursor-pointer active:bg-primary-50')}
            onClick={() => setVista({ nombre: 'mis-tramites' })}
          >
            <div className={cn(menuItemIcon, 'bg-primary-50 text-primary-700')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className={menuItemContent}>
              <div className={cn(menuItemTitle, 'mb-0.5')}>Mis Trámites</div>
              <div className={menuItemDesc}>Historial y estado de actas</div>
            </div>
            <div className="text-text-light shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>

          {ultimaIntervencion && (
            <div className={cn(menuItem, 'cursor-default active:bg-primary-50')}>
              <div className={cn(menuItemIcon, 'bg-success-bg text-success')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div className={menuItemContent}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(menuItemTitle, 'm-0')}>Última intervención</span>
                  <span className={cn(badge('neutral'), 'text-[0.6875rem]')}>
                    #{ultimaIntervencion.localId.slice(0, 6)}
                  </span>
                </div>
                <div className={menuItemDesc}>
                  {TITULO_CAMINO[ultimaIntervencion.camino] ?? ultimaIntervencion.camino} · {ultimaIntervencion.identificado ? 'Identificado' : 'Saneamiento'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-bg-app relative isolate">
      {/* Esquinas decorativas de fondo MDSJL (Fluido y sin lag) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[58px] left-0 w-[150px] h-[150px] min-[480px]:w-[185px] min-[480px]:h-[185px] bg-[url('/assets/corner-top.png')] bg-no-repeat bg-contain bg-top-left opacity-70 select-none pointer-events-none" />
        <div className="absolute bottom-[62px] right-0 w-[150px] h-[150px] min-[480px]:w-[185px] min-[480px]:h-[185px] bg-[url('/assets/corner-bottom.png')] bg-no-repeat bg-contain bg-bottom-right opacity-70 select-none pointer-events-none" />
      </div>

      <AppHeader
        pendientes={pendientes}
        sincronizando={sincronizando}
        onSincronizar={handleSincronizarAhora}
        fiscalizadorDni={fiscalizadorDni}
      />

      {sesionExpirada && !mostrarLogin && (
        <div className="px-4 py-3 max-w-[540px] mx-auto w-full">
          <div className={alerta('warning')} role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold mb-0.5">Sesión expirada</div>
              <p className="text-[0.8125rem] mb-2">
                Tu sesión venció y no se pudo renovar. La sincronización queda pausada — lo que ya capturaste no se pierde.
              </p>
              <button
                type="button"
                className={btn('primary', { tamano: 'sm' })}
                onClick={() => setMostrarLogin(true)}
              >
                Iniciar sesión nuevamente
              </button>
            </div>
          </div>
        </div>
      )}

      {contenido}

      {/* Barra de Navegación Inferior Móvil Permanente con FAB Central (+) */}
      <BottomNavBar
        vistaActual={vista.nombre}
        onCambiarVista={(v) => setVista({ nombre: v })}
        onNuevaIntervencion={() => setVista({ nombre: 'nueva-intervencion' })}
        tieneObservadas={Boolean(observadasCount && observadasCount > 0)}
        pendientesSync={pendientes}
      />

      {mostrarLogin && (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.6)] backdrop-blur-[4px] z-[100] overflow-y-auto">
          <LoginScreen
            onListo={() => {
              setSesionExpirada(false);
              setMostrarLogin(false);
              setFiscalizadorDni(obtenerFiscalizadorActivo());
            }}
          />
        </div>
      )}
    </div>
  );
}
