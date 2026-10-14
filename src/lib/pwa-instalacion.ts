/*
 * Instalación de la PWA y almacenamiento persistente.
 * Todo es opcional: si el navegador no soporta estas APIs, las funciones
 * no lanzan y simplemente no ofrecen nada.
 */

/** Evento no estándar de Chrome/Android que permite disparar el diálogo de instalación. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let eventoInstalacion: BeforeInstallPromptEvent | null = null;
const suscriptores = new Set<() => void>();
let capturaIniciada = false;

function notificar(): void {
  suscriptores.forEach((cb) => {
    try {
      cb();
    } catch {
      // Un suscriptor con error no debe impedir avisar a los demás
    }
  });
}

/**
 * Captura beforeinstallprompt (una sola vez) para mostrar nuestro propio botón
 * de instalación. Debe llamarse al cargar la app, antes de que React monte.
 */
export function iniciarCapturaInstalacion(): void {
  if (capturaIniciada || typeof window === 'undefined') return;
  capturaIniciada = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacion = e as BeforeInstallPromptEvent;
    notificar();
  });

  window.addEventListener('appinstalled', () => {
    eventoInstalacion = null;
    notificar();
  });
}

/** Indica si el navegador ya ofreció la instalación y todavía no se usó. */
export function puedeInstalar(): boolean {
  return eventoInstalacion !== null;
}

/** Se suscribe a los cambios de disponibilidad. Devuelve la función de baja. */
export function suscribirInstalacion(cb: () => void): () => void {
  suscriptores.add(cb);
  return () => {
    suscriptores.delete(cb);
  };
}

/** Muestra el diálogo de instalación. Devuelve true si el usuario aceptó. */
export async function instalarApp(): Promise<boolean> {
  const evento = eventoInstalacion;
  if (!evento) return false;
  // prompt() solo puede usarse una vez: se descarta el evento antes de llamarlo
  // para que un doble toque no deje el botón visible pero inútil.
  eventoInstalacion = null;
  notificar();
  try {
    await evento.prompt();
    const eleccion = await evento.userChoice;
    return eleccion.outcome === 'accepted';
  } catch {
    return false;
  }
}

/** Indica si la app ya corre instalada (modo standalone, o iOS con "Agregar a inicio"). */
export function estaInstalada(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * Pide almacenamiento persistente: evita que Chrome borre IndexedDB (trámites
 * sin subir) cuando falta espacio en el celular.
 */
export async function pedirAlmacenamientoPersistente(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return;
    if (!(await navigator.storage.persisted?.())) await navigator.storage.persist();
  } catch {
    // Silencioso: si el navegador no lo permite, la app funciona igual
  }
}
