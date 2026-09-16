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
      <div className="app-container">
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-primary-50)',
              color: 'var(--color-primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.875rem auto',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.2rem' }}>Inspector Municipal</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            Subgerencia de Operaciones de Fiscalización
          </p>

          <div style={{ textAlign: 'left', background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>DNI / ID:</span>
              <span style={{ fontWeight: 700 }}>{fiscalizadorDni ?? 'Sin asignar'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Jurisdicción:</span>
              <span style={{ fontWeight: 600 }}>San Juan de Lurigancho</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Estado:</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Activo en campo</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-block"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' }}
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
      <div className="app-container">
        {/* Identidad del Fiscalizador */}
        <div className="inspector-card">
          <div className="inspector-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="inspector-info">
            <div className="inspector-role">Fiscalizador de Campo</div>
            <div className="inspector-id">
              {fiscalizadorDni ? (fiscalizadorDni.includes('-') || fiscalizadorDni.length > 12 ? `ID #${fiscalizadorDni.slice(0, 8).toUpperCase()}` : `DNI ${fiscalizadorDni}`) : 'En servicio'}
            </div>
          </div>
          <div className="inspector-badge">MDSJL</div>
        </div>

        {/* Tarjeta Hero Principal: Nueva Intervención */}
        <div className="dashboard-hero">
          <div className="dashboard-hero-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Operaciones de Campo</span>
          </div>
          <h2 className="dashboard-hero-title">Nueva Fiscalización</h2>
          <p className="dashboard-hero-desc">
            Captura GPS, datos del administrado, actas correspondientes, evidencias fotográficas y firma digital.
          </p>
          <button
            type="button"
            className="dashboard-hero-btn"
            onClick={() => setVista({ nombre: 'nueva-intervencion' })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Iniciar Nueva Intervención</span>
          </button>
        </div>

        {/* Grilla 2x2 de Indicadores Rápidos */}
        <div className="dashboard-kpi-grid">
          {/* KPI 1: Sincronización */}
          <button
            type="button"
            className="dashboard-kpi-card"
            onClick={handleSincronizarAhora}
            disabled={sincronizando}
            title="Tocar para forzar sincronización"
          >
            <div className="dashboard-kpi-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                style={{ animation: sincronizando ? 'spin 1s linear infinite' : 'none' }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            <div>
              <div className="dashboard-kpi-title">Sincronización</div>
              <div className="dashboard-kpi-value" style={{ color: pendientes > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {pendientes > 0 ? `${pendientes} pend.` : 'Al día'}
              </div>
              <div className="dashboard-kpi-sub">
                {sincronizando ? 'Sincronizando…' : pendientes > 0 ? 'Tocar para enviar' : 'Sin pendientes'}
              </div>
            </div>
          </button>

          {/* KPI 2: Intervenciones Observadas */}
          <button
            type="button"
            className="dashboard-kpi-card"
            onClick={() => setVista({ nombre: 'observadas' })}
            style={{
              borderColor: observadasCount && observadasCount > 0 ? 'var(--color-warning)' : undefined,
              backgroundColor: observadasCount && observadasCount > 0 ? 'var(--color-warning-bg)' : undefined,
            }}
          >
            <div
              className="dashboard-kpi-icon"
              style={{
                backgroundColor: observadasCount && observadasCount > 0 ? 'var(--color-warning)' : undefined,
                color: observadasCount && observadasCount > 0 ? '#ffffff' : undefined,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div className="dashboard-kpi-title">Observadas</div>
              <div
                className="dashboard-kpi-value"
                style={{ color: observadasCount && observadasCount > 0 ? 'var(--color-warning)' : 'var(--color-text-title)' }}
              >
                {observadasCount !== null ? `${observadasCount} por corregir` : '0'}
              </div>
              <div className="dashboard-kpi-sub">
                {observadasCount && observadasCount > 0 ? 'Tocar para revisar' : 'Todo conforme'}
              </div>
            </div>
          </button>
        </div>

        {/* Menú de Gestión Móvil */}
        <div className="menu-group">
          <div className="menu-group-header">Gestión y Expedientes</div>

          <button
            type="button"
            className="menu-item"
            onClick={() => setVista({ nombre: 'mis-tramites' })}
          >
            <div className="menu-item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="menu-item-content">
              <div className="menu-item-title">Mis Trámites</div>
              <div className="menu-item-desc">Consulta el estado en oficina de tus actas enviadas</div>
            </div>
            <div className="menu-item-arrow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>

          {ultimaIntervencion && (
            <div className="menu-item" style={{ cursor: 'default' }}>
              <div className="menu-item-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div className="menu-item-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                  <span className="menu-item-title" style={{ margin: 0 }}>Última intervención</span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                    #{ultimaIntervencion.localId.slice(0, 6)}
                  </span>
                </div>
                <div className="menu-item-desc">
                  {TITULO_CAMINO[ultimaIntervencion.camino] ?? ultimaIntervencion.camino} · {ultimaIntervencion.identificado ? 'Identificado' : 'Saneamiento'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );

  return (
    <div className="app-shell">
      {/* Esquinas decorativas de fondo MDSJL: Únicamente en Inicio para no interferir con wizards ni formularios */}
      {vista.nombre === 'inicio' && (
        <div className="bg-decorations-wrapper">
          <div className="bg-corner-top" />
          <div className="bg-corner-bottom" />
        </div>
      )}

      <AppHeader
        pendientes={pendientes}
        sincronizando={sincronizando}
        onSincronizar={handleSincronizarAhora}
        fiscalizadorDni={fiscalizadorDni}
      />

      {sesionExpirada && !mostrarLogin && (
        <div style={{ padding: '0.75rem 1rem', maxWidth: 540, margin: '0 auto', width: '100%' }}>
          <div className="alert alert-warning" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>Sesión expirada</div>
              <p style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                Tu sesión venció y no se pudo renovar. La sincronización queda pausada — lo que ya capturaste no se pierde.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setMostrarLogin(true)}
              >
                Iniciar sesión nuevamente
              </button>
            </div>
          </div>
        </div>
      )}

      {contenido}

      {/* Barra de Navegación Inferior Móvil con FAB Central (+) */}
      {vista.nombre !== 'nueva-intervencion' && (
        <BottomNavBar
          vistaActual={vista.nombre}
          onCambiarVista={(v) => setVista({ nombre: v })}
          onNuevaIntervencion={() => setVista({ nombre: 'nueva-intervencion' })}
          tieneObservadas={Boolean(observadasCount && observadasCount > 0)}
          pendientesSync={pendientes}
        />
      )}

      {mostrarLogin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            overflowY: 'auto',
          }}
        >
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
