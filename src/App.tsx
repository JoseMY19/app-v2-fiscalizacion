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

type Vista = { nombre: 'inicio' } | { nombre: 'nueva-intervencion' } | { nombre: 'observadas' } | { nombre: 'mis-tramites' };

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
    ) : (
      <div className="app-container">
        {/* Banner de bienvenida / Inicio */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: '1.25rem', color: 'var(--color-primary-900)', marginBottom: '0.25rem' }}>
            Panel de Operaciones de Campo
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 0 }}>
            San Juan de Lurigancho · Registro de intervenciones
          </p>
        </div>

        {/* Tarjeta Principal: Nueva Intervención */}
        <div className="card card--highlight" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', marginBottom: '0.2rem' }}>Registrar Intervención</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 0 }}>
                Captura GPS, datos del administrado, actas, fotos y firma en campo.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            onClick={() => setVista({ nombre: 'nueva-intervencion' })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Iniciar Nueva Intervención</span>
          </button>
        </div>

        {/* Tarjeta de Estado de Sincronización */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9375rem', margin: 0, color: 'var(--color-text-title)' }}>
              Estado de Sincronización
            </h3>
            <span className={`badge ${pendientes > 0 ? 'badge-warning' : 'badge-success'}`}>
              {pendientes > 0 ? `${pendientes} pendiente(s)` : 'Al día'}
            </span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem' }}>
            {pendientes > 0
              ? `Hay ${pendientes} intervención(es) almacenada(s) localmente pendientes de enviar a la central.`
              : 'Todas las intervenciones locales han sido sincronizadas correctamente con el servidor.'}
          </p>

          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={handleSincronizarAhora}
            disabled={sincronizando}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: sincronizando ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{sincronizando ? 'Sincronizando ahora…' : 'Sincronizar ahora'}</span>
          </button>
        </div>

        {/* Tarjeta de Mis Trámites: visibilidad del estado en oficina, siempre disponible */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.9375rem', margin: 0, color: 'var(--color-text-title)' }}>Mis Trámites</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem' }}>
            Revisa en qué va cada intervención que ya sincronizaste (validación, instrucción, resolución).
          </p>
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => setVista({ nombre: 'mis-tramites' })}
          >
            <span>Ver mis trámites</span>
          </button>
        </div>

        {/* Tarjeta de Intervenciones Observadas (V-01/V-02) */}
        {observadasCount !== null && observadasCount > 0 && (
          <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--color-warning, #d97706)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', margin: 0, color: 'var(--color-text-title)' }}>
                Intervenciones Observadas
              </h3>
              <span className="badge badge-warning">{observadasCount} pendiente(s)</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem' }}>
              El validador de oficina devolvió {observadasCount} intervención(es) para corrección.
            </p>
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={() => setVista({ nombre: 'observadas' })}
            >
              <span>Ver y corregir</span>
            </button>
          </div>
        )}

        {/* Tarjeta de Última Intervención (si existe) */}
        {ultimaIntervencion && (
          <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Última intervención guardada
              </span>
              <span className="badge badge-neutral">ID: {ultimaIntervencion.localId.slice(0, 8)}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
              <span className={`badge ${ultimaIntervencion.identificado ? 'badge-success' : 'badge-warning'}`}>
                {ultimaIntervencion.identificado ? 'Administrado identificado' : '⚠ Pendiente de saneamiento'}
              </span>
              <span className="badge badge-primary">
                {TITULO_CAMINO[ultimaIntervencion.camino] ?? ultimaIntervencion.camino}
              </span>
              <span className="badge badge-neutral">
                Lista para sincronizar
              </span>
            </div>
          </div>
        )}
      </div>
    );

  return (
    <div className="app-shell">
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
