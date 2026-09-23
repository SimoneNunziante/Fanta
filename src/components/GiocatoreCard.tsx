import { memo } from "react";
import { coloreRuolo } from "../ruoloColori";
import { SpesaMassimaInput } from "./SpesaMassimaInput";
import type { Giocatore, Priorita } from "../types";

interface Props {
  giocatore: Giocatore;
  preferito: boolean;
  mostraDatiAsta: boolean;
  onTogglePreferito: (giocatoreId: number, preferito: boolean) => void;
  onSalvaSpesaMassima: (giocatoreId: number, valore: number | null) => void;
  onSalvaPriorita: (giocatoreId: number, valore: Priorita | null) => void;
}

const PRIORITA: { valore: Priorita; label: string }[] = [
  { valore: "VERDE", label: "Alta" },
  { valore: "GIALLO", label: "Media" },
  { valore: "ROSSO", label: "Bassa" },
];

export const GiocatoreCard = memo(function GiocatoreCard({
  giocatore: g,
  preferito,
  mostraDatiAsta,
  onTogglePreferito,
  onSalvaSpesaMassima,
  onSalvaPriorita,
}: Props) {
  return (
    <li className="card" data-priorita={mostraDatiAsta ? g.priorita?.toLowerCase() : undefined}>
      <div className="card-riga">
        <div className="card-nome">
          <span className="nome-giocatore">{g.nome}</span>
          <div className="card-sottotitolo">
            <div className="ruolo-badges">
              {g.ruolo.map((r) => (
                <span key={r} className="ruolo-badge" data-colore={coloreRuolo(r)}>
                  {r}
                </span>
              ))}
            </div>
            <span className="card-squadra">{g.squadra}</span>
          </div>
        </div>
        <button
          type="button"
          className={preferito ? "stella attiva" : "stella"}
          aria-label={preferito ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
          aria-pressed={preferito}
          onClick={() => onTogglePreferito(g.id, preferito)}
        >
          {preferito ? "★" : "☆"}
        </button>
      </div>

      <div className="card-valori">
        <span>
          <small>Quot.</small> <strong>{g.quotazioneAsta}</strong>
        </span>
        <span>
          <small>FVM</small> <strong>{g.fantaValoreMedio}</strong>
        </span>
      </div>

      {mostraDatiAsta && (
        <div className="card-asta">
          <label className="card-spesa">
            <small>Max</small>
            <SpesaMassimaInput valore={g.spesaMassima} onSalva={(v) => onSalvaSpesaMassima(g.id, v)} />
          </label>
          <div className="priorita-scelta" role="group" aria-label="Priorità">
            {PRIORITA.map((p) => (
              <button
                key={p.valore}
                type="button"
                className="priorita-dot"
                data-colore={p.valore.toLowerCase()}
                aria-label={`Priorità ${p.label}`}
                aria-pressed={g.priorita === p.valore}
                onClick={() => onSalvaPriorita(g.id, g.priorita === p.valore ? null : p.valore)}
              />
            ))}
          </div>
        </div>
      )}
    </li>
  );
});
