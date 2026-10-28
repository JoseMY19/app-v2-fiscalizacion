import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { btnCampo, btnIconBack, tarjetaSuave } from '../lib/ui';

const ZOOM_MAX = 5;
const ZOOM_DOBLE_TOQUE = 2.5;

interface Vista {
  escala: number;
  x: number;
  y: number;
}
const VISTA_INICIAL: Vista = { escala: 1, x: 0, y: 0 };

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Foto oficial del DNI para comprobar a la persona en el sitio: chica en el formulario y, al tocarla, a pantalla
 * completa con zoom (pellizcar), arrastre y doble toque. Solo se muestra; nunca se guarda ni se sincroniza.
 * El zoom de la página está desactivado en toda la app, por eso el gesto se resuelve aquí con pointer events.
 */
export default function FotoDniAmpliable({ foto }: { foto: string }) {
  const [ampliada, setAmpliada] = useState(false);
  const src = foto.startsWith('data:') ? foto : `data:image/jpeg;base64,${foto}`;

  return (
    <>
      <figure className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-border bg-bg-subtle">
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          aria-label="Ver la foto en grande"
          className="relative shrink-0 p-0 border-0 bg-transparent rounded-md cursor-pointer"
        >
          <img src={src} alt="Foto oficial del DNI" className="w-20 h-24 rounded-md object-cover bg-bg-raised block" />
          <span className="absolute right-1 bottom-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[0.625rem] font-semibold">Ampliar</span>
        </button>
        <figcaption className="text-[0.75rem] text-text-muted leading-snug">
          <strong className="block text-[0.8125rem] text-text-title">Foto oficial RENIEC</strong>
          Toca la foto para verla en grande y compárala con la persona. Solo se muestra: no se guarda en el acta.
        </figcaption>
      </figure>

      {ampliada && <VisorFoto src={src} onCerrar={() => setAmpliada(false)} />}
    </>
  );
}

function VisorFoto({ src, onCerrar }: { src: string; onCerrar: () => void }) {
  const [vista, setVista] = useState<Vista>(VISTA_INICIAL);
  const imagen = useRef<HTMLImageElement>(null);
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const distanciaAnterior = useRef(0);
  const huboGesto = useRef(false);
  const ultimoToque = useRef(0);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  // Con zoom, la foto no se puede arrastrar más allá de sus bordes.
  const dentroDeBordes = (v: Vista): Vista => {
    const ancho = imagen.current?.offsetWidth ?? 0;
    const alto = imagen.current?.offsetHeight ?? 0;
    const maxX = (ancho * (v.escala - 1)) / 2;
    const maxY = (alto * (v.escala - 1)) / 2;
    return { escala: v.escala, x: limitar(v.x, -maxX, maxX), y: limitar(v.y, -maxY, maxY) };
  };

  const alBajar = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    huboGesto.current = false;
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      distanciaAnterior.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const alMover = (e: React.PointerEvent) => {
    const previo = punteros.current.get(e.pointerId);
    if (!previo) return;
    const actual = { x: e.clientX, y: e.clientY };
    const dx = actual.x - previo.x;
    const dy = actual.y - previo.y;
    punteros.current.set(e.pointerId, actual);
    if (Math.abs(dx) + Math.abs(dy) > 2) huboGesto.current = true;

    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      const distancia = Math.hypot(a.x - b.x, a.y - b.y);
      if (distanciaAnterior.current > 0) {
        const factor = distancia / distanciaAnterior.current;
        setVista((v) => {
          const escala = limitar(v.escala * factor, 1, ZOOM_MAX);
          return escala === 1 ? VISTA_INICIAL : dentroDeBordes({ escala, x: v.x + dx / 2, y: v.y + dy / 2 });
        });
      }
      distanciaAnterior.current = distancia;
    } else if (punteros.current.size === 1) {
      setVista((v) => (v.escala > 1 ? dentroDeBordes({ ...v, x: v.x + dx, y: v.y + dy }) : v));
    }
  };

  const alSoltar = (e: React.PointerEvent) => {
    punteros.current.delete(e.pointerId);
    distanciaAnterior.current = 0;
    // Doble toque: alterna entre el tamaño normal y un zoom cómodo.
    if (!huboGesto.current && punteros.current.size === 0) {
      const ahora = Date.now();
      if (ahora - ultimoToque.current < 300) {
        setVista((v) => (v.escala > 1 ? VISTA_INICIAL : { escala: ZOOM_DOBLE_TOQUE, x: 0, y: 0 }));
        ultimoToque.current = 0;
      } else {
        ultimoToque.current = ahora;
      }
    }
  };

  const alRodar = (e: React.WheelEvent) => {
    setVista((v) => {
      const escala = limitar(v.escala * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, ZOOM_MAX);
      return escala === 1 ? VISTA_INICIAL : dentroDeBordes({ ...v, escala });
    });
  };

  const icono = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  // En un portal sobre <body>: así queda por encima de la barra de navegación y de cualquier capa de la pantalla.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Foto oficial del DNI" className="fixed inset-0 z-[1000] flex flex-col gap-3 bg-bg-app px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className={cn(tarjetaSuave, 'shrink-0 flex items-center justify-between gap-3 px-4 py-3.5')}>
        <div className="min-w-0 flex flex-col gap-0.5">
          <h2 className="font-titulo text-[1.25rem] font-black text-text-title leading-tight m-0">Foto oficial RENIEC</h2>
          <p className="text-[0.8125rem] text-text-muted leading-[1.35] m-0">Compárala con la persona. No se guarda.</p>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar la foto" title="Cerrar" className={btnIconBack}>
          <svg {...icono}>
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </header>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className={cn(tarjetaSuave, 'relative w-full max-w-[420px] max-h-full overflow-hidden p-2 touch-none select-none')}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onWheel={alRodar}
        >
          <div className="overflow-hidden rounded-[12px] bg-bg-subtle">
            <img
              ref={imagen}
              src={src}
              alt="Foto oficial del DNI, ampliada"
              draggable={false}
              className="block w-full h-auto max-h-[calc(100dvh-18rem)] object-contain mx-auto [transition:transform_80ms_ease-out]"
              // Valor dinámico del gesto: Tailwind no puede expresarlo.
              style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}
            />
          </div>
          <span className="absolute left-4 top-4 px-2.5 py-1 rounded-pill bg-white/90 border border-solid border-campo-100 text-campo-700 text-[0.75rem] font-bold pointer-events-none">
            {Math.round(vista.escala * 100)}%
          </span>
        </div>
      </div>

      <footer className="shrink-0 flex flex-col gap-3">
        <p className="m-0 text-center text-[0.75rem] text-text-muted">Pellizca para acercar · toca dos veces para ampliar</p>
        <button type="button" onClick={onCerrar} className={btnCampo}>
          Cerrar
        </button>
      </footer>
    </div>,
    document.body,
  );
}
