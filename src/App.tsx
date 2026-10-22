import { useEffect, useState } from 'react';
import { TipoActuacion } from '@pas-sjl/shared-types';
import NuevaIntervencionWizard from './features/nueva-intervencion/NuevaIntervencionWizard';
import { obtenerUltimaIntervencion, type UltimaIntervencion } from './features/nueva-intervencion/intervenciones.repository';
import LoginScreen from './features/auth/LoginScreen';
import CambiarContrasenaScreen from './features/auth/CambiarContrasenaScreen';
import { cerrarSesion, obtenerFiscalizadorActivo, obtenerSesion } from './features/auth/auth.repository';
import { contarPendientes } from './features/sincronizacion/sync-cola.repository';
import { escanearYSincronizar, iniciarMotorSincronizacion } from './features/sincronizacion/motor-sincronizacion';
import { suscribirseACambiosSync, suscribirseASesionExpirada } from './features/sincronizacion/sync-eventos';
import MisTramitesScreen from './features/mis-tramites/MisTramitesScreen';
import PerfilScreen from './features/perfil/PerfilScreen';
import { socket } from './lib/socket';

import AppHeader from './components/AppHeader';
import BottomNavBar from './components/BottomNavBar';
import { cn } from './lib/cn';
import { iniciales } from './lib/iniciales';
import { alerta, appContainer, badge, brilloHero, btn, chipHero, iconoTarjeta, kpiChip, tarjetaHero, tarjetaSuave } from './lib/ui';

const brilloFondo = 'absolute rounded-full blur-3xl';


const kpiCardBase = cn(
  tarjetaSuave,
  'flex items-center gap-3.5 px-4 py-3.5 w-full text-left cursor-pointer transition-[box-shadow,transform] duration-150 ' +
    'hover:shadow-[0_10px_24px_-6px_rgba(14,26,59,0.16),0_2px_4px_rgba(14,26,59,0.06)] active:scale-[0.98]',
);
const kpiBody = 'flex-1 min-w-0 flex flex-col gap-0.5';
const kpiLabel = 'text-[0.8125rem] font-medium text-text-muted leading-tight';
const kpiDetail = 'text-[1.0625rem] font-bold text-text-title leading-tight';

const menuItem =
  'flex items-center gap-3 px-4 py-3.5 bg-transparent border-0 border-b border-solid border-border last:border-b-0 w-full text-left text-inherit transition-colors duration-150';
const menuItemIcon = cn(iconoTarjeta, 'bg-campo-50 text-campo-700');
const menuItemContent = 'flex-1 min-w-0';
const menuItemTitle = 'text-sm font-bold text-text-title';
const menuItemDesc = 'text-xs text-text-muted whitespace-nowrap overflow-hidden text-ellipsis';

type Vista =
  | { nombre: 'inicio' }
  | { nombre: 'nueva-intervencion' }
  | { nombre: 'mis-tramites' }
  | { nombre: 'perfil' };

// Mismo mapeo que TipoActuacionScreen.tsx — nunca se muestra el enum crudo al usuario.
const TITULO_CAMINO: Record<string, string> = {
  [TipoActuacion.EXHORTACION]: 'Solo Exhortación',
  [TipoActuacion.CONSTATACION]: 'Solo Constatación',
  [TipoActuacion.INICIA_PAS]: 'Inicia PAS',
};

const fechaHoy = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

export default function App() {
  const [vista, setVista] = useState<Vista>({ nombre: 'inicio' });
  const [pendientes, setPendientes] = useState<number>(0);
  const [sincronizando, setSincronizando] = useState(false);
  // Feedback mínimo del criterio de HU-05 ("se marca visualmente ... como
  // Pendiente de saneamiento"). Se lee de Dexie para que sobreviva recargas.
  const [ultimaIntervencion, setUltimaIntervencion] = useState<UltimaIntervencion | null>(null);
  // HU-28: "¿hubo login alguna vez en este dispositivo?" — null mientras se
  // verifica, luego true/false. Deliberadamente NO pregunta si el access
  // token de ahora mismo es válido: la captura de campo es 100% local
  // (Dexie), así que un token vencido nunca debe tapar la app.
  const [tieneFiscalizador, setTieneFiscalizador] = useState<boolean | null>(null);
  const [fiscalizadorDni, setFiscalizadorDni] = useState<string | null>(null);
  // Contraseña temporal: si cerró la app antes de cambiarla, al volver sigue
  // obligado — la bandera queda en la sesión guardada hasta que la cambie.
  const [debeCambiarContrasena, setDebeCambiarContrasena] = useState(false);
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

  useEffect(() => {
    const fiscalizador = obtenerFiscalizadorActivo();
    setTieneFiscalizador(fiscalizador !== null);
    setFiscalizadorDni(fiscalizador);
    setDebeCambiarContrasena(obtenerSesion()?.usuario.debeCambiarContrasena === true);
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
    obtenerUltimaIntervencion().then(setUltimaIntervencion);
    // Canal adicional de aviso en vivo (RealtimeGateway) — jamás el
    // transporte de sincronización, que sigue siendo el motor de arriba.
    socket.connect();
    return suscribirseACambiosSync(() => {
      contarPendientes().then(setPendientes);
    });
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

  if (debeCambiarContrasena) {
    return (
      <CambiarContrasenaScreen
        onListo={() => setDebeCambiarContrasena(false)}
        onCerrarSesion={() => {
          cerrarSesion();
          setDebeCambiarContrasena(false);
          setTieneFiscalizador(false);
          setFiscalizadorDni(null);
        }}
      />
    );
  }

  const usuarioSesion = obtenerSesion()?.usuario ?? null;

  const contenido =
    vista.nombre === 'nueva-intervencion' ? (
      <NuevaIntervencionWizard
        modoEdicion={corrigiendoLocalId !== null}
        localIdInicial={corrigiendoLocalId ?? undefined}
        onFinalizar={() => {
          obtenerUltimaIntervencion().then(setUltimaIntervencion);
          setCorrigiendoLocalId(null);
          setVista({ nombre: 'inicio' });
        }}
        onCancelar={() => {
          setCorrigiendoLocalId(null);
          setVista({ nombre: 'inicio' });
        }}
      />
    ) : vista.nombre === 'mis-tramites' ? (
      <MisTramitesScreen onVolver={() => setVista({ nombre: 'inicio' })} />
    ) : vista.nombre === 'perfil' ? (
      <PerfilScreen
        usuario={usuarioSesion}
        pendientes={pendientes}
        onCerrarSesion={() => {
          cerrarSesion();
          setTieneFiscalizador(false);
          setFiscalizadorDni(null);
          setVista({ nombre: 'inicio' });
        }}
      />
    ) : (
      <div className={appContainer}>
        {/* Identidad del Fiscalizador */}
        <div className={cn(tarjetaSuave, 'flex items-center gap-3.5 px-4 py-3.5 mb-4')}>
          <div className={cn(iconoTarjeta, 'rounded-full bg-[linear-gradient(135deg,var(--color-campo-700),var(--color-campo-900))] text-white text-sm font-bold tracking-[0.02em]')}>
            {usuarioSesion?.nombres ? (
              iniciales(usuarioSesion.nombres)
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-muted mb-[0.1rem] first-letter:uppercase">{fechaHoy.format(new Date())}</div>
            <div className="text-[0.9375rem] font-bold text-text-title whitespace-nowrap overflow-hidden text-ellipsis">
              {usuarioSesion?.nombres
                ? `Hola, ${usuarioSesion.nombres}`
                : fiscalizadorDni ? (fiscalizadorDni.includes('-') || fiscalizadorDni.length > 12 ? `ID #${fiscalizadorDni.slice(0, 8).toUpperCase()}` : `DNI ${fiscalizadorDni}`) : 'En servicio'}
            </div>
            <div className="text-xs text-text-muted whitespace-nowrap overflow-hidden text-ellipsis">
              Fiscalizador de Campo{usuarioSesion?.dni ? ` · DNI ${usuarioSesion.dni}` : ''}
            </div>
          </div>
          <div className="text-[0.6875rem] font-bold text-campo-700 bg-campo-50 border border-solid border-campo-100 px-2 py-[0.2rem] rounded-pill tracking-[0.05em] shrink-0">MDSJL</div>
        </div>

        {/* Tarjeta Hero Principal: Nueva Intervención */}
        <div className={cn(tarjetaHero, 'px-5 pt-[1.15rem] pb-6 mb-5')}>
          {/* Brillos difusos de fondo */}
          <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
            <div className={cn(brilloHero, '-top-10 -right-8 w-44 h-44 bg-sjl-amarillo/45')} />
            <div className={cn(brilloHero, '-bottom-14 left-1/3 w-48 h-40 bg-sjl-celeste/40')} />
            <div className={cn(brilloHero, '-top-12 -left-10 w-36 h-36 bg-sjl-rosa/35')} />
          </div>

          <div className={cn(chipHero, 'mb-3')}>
            <span className="w-2 h-2 rounded-full bg-white" aria-hidden="true" />
            <span className="uppercase tracking-[0.06em]">Operaciones de Campo</span>
          </div>
          <h2 className="font-titulo text-[1.875rem] font-black text-white leading-none tracking-[-0.01em] mb-2">Nueva Fiscalización</h2>
          <p className="text-[0.8125rem] text-white/85 mb-4 leading-[1.4]">
            Registro de actas, evidencias y firma digital en campo
          </p>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-pill bg-white/15 border border-solid border-white/25 backdrop-blur-sm text-white font-bold text-[0.9375rem] cursor-pointer transition-[background-color,transform] duration-150 hover:bg-white/25 active:scale-[0.98]"
            onClick={() => setVista({ nombre: 'nueva-intervencion' })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Iniciar Intervención</span>
          </button>

          {/* Franja multicolor SJL en el borde inferior */}
          <div className="absolute left-0 right-0 bottom-0 h-1.5 bg-franja-sjl" aria-hidden="true" />
        </div>

        {/* Indicador de sincronización */}
        <div className="grid grid-cols-1 gap-3 mb-5">
          {/* KPI 1: Sincronización */}
          <button
            type="button"
            className={kpiCardBase}
            onClick={handleSincronizarAhora}
            disabled={sincronizando}
            title="Tocar para forzar sincronización"
          >
            <div className={cn(iconoTarjeta, 'bg-campo-50 text-campo-700')}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className={sincronizando ? 'animate-spin' : undefined}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            <div className={kpiBody}>
              <div className={kpiLabel}>Sincronización</div>
              <div className={kpiDetail}>
                {sincronizando ? 'Sincronizando…' : pendientes > 0 ? 'Tocar para enviar' : 'Expedientes al día'}
              </div>
            </div>
            <span className={kpiChip(pendientes > 0 ? 'warning' : 'success')}>
              {pendientes > 0 ? `${pendientes} pend.` : 'Al día'}
            </span>
          </button>

        </div>

        {/* Menú de Gestión Móvil */}
        <div className={cn(tarjetaSuave, 'overflow-hidden mb-5')}>
          <div className="text-[0.725rem] font-bold uppercase tracking-[0.06em] text-text-muted pt-3.5 px-4 pb-[0.4rem]">Gestión y Expedientes</div>

          <button
            type="button"
            className={cn(menuItem, 'cursor-pointer active:bg-campo-50')}
            onClick={() => setVista({ nombre: 'mis-tramites' })}
          >
            <div className={menuItemIcon}>
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

          <div className={cn(menuItem, 'cursor-default')}>
            <div className={cn(iconoTarjeta, ultimaIntervencion ? 'bg-success-bg text-success' : 'bg-bg-subtle text-text-light')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className={menuItemContent}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn(menuItemTitle, 'm-0')}>Última intervención</span>
                {ultimaIntervencion && (
                  <span className={cn(badge('neutral'), 'text-[0.6875rem]')}>
                    #{ultimaIntervencion.localId.slice(0, 6)}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted leading-snug">
                {ultimaIntervencion
                  ? `${TITULO_CAMINO[ultimaIntervencion.camino] ?? ultimaIntervencion.camino} · ${ultimaIntervencion.identificado ? 'Identificado' : 'Saneamiento'}`
                  : 'Aún no registras intervenciones'}
              </div>
            </div>
          </div>

        </div>
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-bg-app relative isolate">
      {/* Fondo: velo magenta muy suave arriba y brillos difusos de la paleta SJL */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-campo-50)_0%,var(--color-bg-app)_40%)]" />
        <div className={cn(brilloFondo, '-top-16 -right-20 w-72 h-72 bg-campo-200/50')} />
        <div className={cn(brilloFondo, 'top-1/2 -left-28 w-72 h-72 bg-sjl-celeste/10')} />
        <div className={cn(brilloFondo, '-bottom-10 -right-24 w-80 h-80 bg-sjl-amarillo/15')} />
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
                Tu sesión venció y no se pudo renovar. La sincronización queda pausada - lo que ya capturaste no se pierde.
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
        onSincronizar={handleSincronizarAhora}
        sincronizando={sincronizando}
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
