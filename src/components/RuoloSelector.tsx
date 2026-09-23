import { coloreRuolo } from "../ruoloColori";
import type { Modalita } from "../types";

interface Props {
  modalita: Modalita;
  ruoli: string[];
  onRuoloToggle: (r: string) => void;
  onReset: () => void;
}

const RUOLI_CLASSICO = ["P", "D", "C", "A"];
const RUOLI_MANTRA = ["Por", "Dc", "Dd", "Ds", "B", "E", "M", "C", "W", "T", "A", "Pc"];

export function RuoloSelector({ modalita, ruoli, onRuoloToggle, onReset }: Props) {
  const opzioni = modalita === "CLASSICO" ? RUOLI_CLASSICO : RUOLI_MANTRA;

  return (
    <div className="ruolo-selector" role="group" aria-label="Ruoli (selezione multipla)">
      <button
        type="button"
        className={ruoli.length === 0 ? "toggle active" : "toggle"}
        onClick={onReset}
      >
        Tutti
      </button>
      {opzioni.map((r) => (
        <button
          key={r}
          type="button"
          data-colore={coloreRuolo(r)}
          className={ruoli.includes(r) ? "toggle ruolo-toggle active" : "toggle ruolo-toggle"}
          onClick={() => onRuoloToggle(r)}
          aria-pressed={ruoli.includes(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
