import type { Base, Modalita } from "../types";

interface Props {
  modalita: Modalita;
  base: Base;
  onModalitaChange: (m: Modalita) => void;
  onBaseChange: (b: Base) => void;
}

const MODALITA_OPTIONS: { value: Modalita; label: string }[] = [
  { value: "CLASSICO", label: "Classico" },
  { value: "MANTRA", label: "Mantra" },
];

const BASE_OPTIONS: { value: Base; label: string }[] = [
  { value: "CINQUECENTO", label: "500" },
  { value: "MILLE", label: "1000" },
];

export function FiltriBar({ modalita, base, onModalitaChange, onBaseChange }: Props) {
  return (
    <div className="filtri-bar">
      <div className="toggle-group" role="group" aria-label="Modalita">
        {MODALITA_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={opt.value === modalita ? "toggle active" : "toggle"}
            onClick={() => onModalitaChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="toggle-group" role="group" aria-label="Base quotazione">
        {BASE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={opt.value === base ? "toggle active" : "toggle"}
            onClick={() => onBaseChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
