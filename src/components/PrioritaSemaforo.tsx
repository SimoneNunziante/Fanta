import type { Priorita } from "../types";

interface Props {
  valore: Priorita | null;
  onCambia: (valore: Priorita | null) => void;
}

const CICLO: (Priorita | null)[] = [null, "VERDE", "GIALLO", "ROSSO"];

export function PrioritaSemaforo({ valore, onCambia }: Props) {
  function handleClick() {
    const indiceAttuale = CICLO.indexOf(valore);
    const prossimo = CICLO[(indiceAttuale + 1) % CICLO.length];
    onCambia(prossimo);
  }

  return (
    <button
      type="button"
      className="semaforo-dot"
      data-colore={valore ? valore.toLowerCase() : "vuoto"}
      aria-label={`Priorità: ${valore ?? "nessuna"} (click per cambiare)`}
      onClick={handleClick}
    />
  );
}
