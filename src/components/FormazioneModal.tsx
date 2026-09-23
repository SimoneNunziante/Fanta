import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  squadra: string;
  url: string;
  onClose: () => void;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const ZOOM_DOPPIO_TOCCO = 2.5;
const DOPPIO_TOCCO_MS = 300;

type Punto = { x: number; y: number };

function limita(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(2)));
}

export function FormazioneModal({ squadra, url, onClose }: Props) {
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [offset, setOffset] = useState<Punto>({ x: 0, y: 0 });
  const [naturale, setNaturale] = useState<{ w: number; h: number } | null>(null);
  const [contenitore, setContenitore] = useState<{ w: number; h: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Gesti: puntatori attivi (dita o mouse), stato all'inizio del trascinamento / pinch, ultimo tocco.
  const puntatori = useRef(new Map<number, Punto>());
  const inizioTrascino = useRef<{ punto: Punto; offset: Punto } | null>(null);
  const inizioPinch = useRef<{ distanza: number; zoom: number; offset: Punto } | null>(null);
  const ultimoTocco = useRef(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("scroll-bloccato");
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("scroll-bloccato");
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const osserva = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContenitore({ w: width, h: height });
    });
    osserva.observe(el);
    return () => osserva.disconnect();
  }, []);

  // Dimensione "a schermo intero nel riquadro" calcolata sulla risoluzione reale del file,
  // poi moltiplicata per lo zoom: il browser ridecodifica l'immagine a quella dimensione
  // invece di scalare via CSS una bitmap gia' rimpicciolita (che sfoca).
  const scalaFit =
    naturale && contenitore && naturale.w > 0 && naturale.h > 0 && contenitore.w > 0 && contenitore.h > 0
      ? Math.min(contenitore.w / naturale.w, contenitore.h / naturale.h, 1)
      : null;

  /** Tiene l'immagine dentro il riquadro: si puo' spostare solo della parte che eccede. */
  function vincola(o: Punto, z: number): Punto {
    if (!naturale || !contenitore || scalaFit == null) return { x: 0, y: 0 };
    const maxX = Math.max(0, (naturale.w * scalaFit * z - contenitore.w) / 2);
    const maxY = Math.max(0, (naturale.h * scalaFit * z - contenitore.h) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }

  function impostaZoom(nuovo: number, offsetBase: Punto = offset, zoomBase: number = zoom) {
    const z = limita(nuovo);
    // Lo spostamento scala con lo zoom, cosi' resta inquadrata la stessa zona.
    const o = { x: (offsetBase.x * z) / zoomBase, y: (offsetBase.y * z) / zoomBase };
    setZoom(z);
    setOffset(z === ZOOM_MIN ? { x: 0, y: 0 } : vincola(o, z));
  }

  function resetZoom() {
    setZoom(ZOOM_MIN);
    setOffset({ x: 0, y: 0 });
  }

  function handleWheel(e: React.WheelEvent) {
    impostaZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }

  function distanzaPuntatori(): number {
    const [a, b] = [...puntatori.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function handlePointerDown(e: React.PointerEvent) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Puntatore gia' rilasciato: il gesto continua comunque con gli eventi sul riquadro.
    }
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (puntatori.current.size === 2) {
      inizioTrascino.current = null;
      inizioPinch.current = { distanza: distanzaPuntatori(), zoom, offset };
      return;
    }

    const ora = Date.now();
    if (ora - ultimoTocco.current < DOPPIO_TOCCO_MS) {
      ultimoTocco.current = 0;
      if (zoom > ZOOM_MIN) resetZoom();
      else impostaZoom(ZOOM_DOPPIO_TOCCO);
      return;
    }
    ultimoTocco.current = ora;
    inizioTrascino.current = { punto: { x: e.clientX, y: e.clientY }, offset };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!puntatori.current.has(e.pointerId)) return;
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pinch = inizioPinch.current;
    if (pinch && puntatori.current.size === 2 && pinch.distanza > 0) {
      impostaZoom((pinch.zoom * distanzaPuntatori()) / pinch.distanza, pinch.offset, pinch.zoom);
      return;
    }
    const trascino = inizioTrascino.current;
    if (trascino && zoom > ZOOM_MIN) {
      setOffset(
        vincola(
          {
            x: trascino.offset.x + e.clientX - trascino.punto.x,
            y: trascino.offset.y + e.clientY - trascino.punto.y,
          },
          zoom,
        ),
      );
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    puntatori.current.delete(e.pointerId);
    if (puntatori.current.size < 2) inizioPinch.current = null;
    // Se resta un dito dopo il pinch, riparte il trascinamento da li'.
    const [rimasto] = [...puntatori.current.values()];
    inizioTrascino.current = rimasto ? { punto: rimasto, offset } : null;
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setNaturale({ w: img.naturalWidth, h: img.naturalHeight });
  }

  const pronto = naturale != null && scalaFit != null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Formazione {squadra}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <div className="modal-zoom-controls">
          <button type="button" onClick={() => impostaZoom(zoom - ZOOM_STEP * 2)} disabled={zoom <= ZOOM_MIN}>
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => impostaZoom(zoom + ZOOM_STEP * 2)} disabled={zoom >= ZOOM_MAX}>
            +
          </button>
          <button type="button" onClick={resetZoom} disabled={zoom === ZOOM_MIN}>
            Reset
          </button>
        </div>
        <div
          className="modal-image-wrapper"
          ref={wrapperRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ cursor: zoom > ZOOM_MIN ? "grab" : "zoom-in" }}
        >
          <img
            src={url}
            alt={`Formazione ${squadra}`}
            className="modal-image"
            draggable={false}
            onLoad={handleImageLoad}
            style={
              pronto
                ? {
                    width: naturale.w * scalaFit * zoom,
                    height: naturale.h * scalaFit * zoom,
                    maxWidth: "none",
                    flex: "none",
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                  }
                : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", visibility: "hidden" }
            }
          />
        </div>
        <p className="modal-suggerimento">Trascina con un dito · pizzica per lo zoom · doppio tocco per ingrandire</p>
      </div>
    </div>
  );
}
