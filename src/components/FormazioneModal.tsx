import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  squadra: string;
  url: string;
  onClose: () => void;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

export function FormazioneModal({ squadra, url, onClose }: Props) {
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [naturale, setNaturale] = useState<{ w: number; h: number } | null>(null);
  const [contenitore, setContenitore] = useState<{ w: number; h: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trascinoDa = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  function cambiaZoom(delta: number) {
    setZoom((z) => {
      const nuovo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2)));
      if (nuovo === ZOOM_MIN) setOffset({ x: 0, y: 0 });
      return nuovo;
    });
  }

  function resetZoom() {
    setZoom(ZOOM_MIN);
    setOffset({ x: 0, y: 0 });
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    cambiaZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom === ZOOM_MIN) return;
    trascinoDa.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!trascinoDa.current) return;
    setOffset({
      x: e.clientX - trascinoDa.current.x,
      y: e.clientY - trascinoDa.current.y,
    });
  }

  function handleMouseUp() {
    trascinoDa.current = null;
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setNaturale({ w: img.naturalWidth, h: img.naturalHeight });
  }

  // Dimensione "a schermo intero nel riquadro" calcolata sulla risoluzione reale del file,
  // poi moltiplicata per lo zoom: il browser ridecodifica l'immagine a quella dimensione
  // invece di scalare via CSS una bitmap gia' rimpicciolita (che sfoca).
  let larghezza: number | undefined;
  let altezza: number | undefined;
  if (naturale && contenitore && naturale.w > 0 && naturale.h > 0 && contenitore.w > 0 && contenitore.h > 0) {
    const scalaFit = Math.min(contenitore.w / naturale.w, contenitore.h / naturale.h, 1);
    larghezza = naturale.w * scalaFit * zoom;
    altezza = naturale.h * scalaFit * zoom;
  }
  const pronto = larghezza !== undefined && altezza !== undefined;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Formazione {squadra}</h2>
          <div className="modal-zoom-controls">
            <button type="button" onClick={() => cambiaZoom(-ZOOM_STEP)} disabled={zoom <= ZOOM_MIN}>
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => cambiaZoom(ZOOM_STEP)} disabled={zoom >= ZOOM_MAX}>
              +
            </button>
            <button type="button" onClick={resetZoom} disabled={zoom === ZOOM_MIN}>
              Reset
            </button>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <div
          className="modal-image-wrapper"
          ref={wrapperRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={url}
            alt={`Formazione ${squadra}`}
            className="modal-image"
            draggable={false}
            onLoad={handleImageLoad}
            onClick={() => zoom === ZOOM_MIN && cambiaZoom(ZOOM_STEP)}
            style={
              pronto
                ? {
                    width: larghezza,
                    height: altezza,
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                    cursor: zoom > ZOOM_MIN ? "grab" : "zoom-in",
                  }
                : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", visibility: "hidden" }
            }
          />
        </div>
      </div>
    </div>
  );
}
