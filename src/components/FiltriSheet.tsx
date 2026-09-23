import { useEffect } from "react";
import { FiltriBar } from "./FiltriBar";
import { RuoloSelector } from "./RuoloSelector";
import { SquadraSelector } from "./SquadraSelector";
import { BackupDati } from "./BackupDati";
import type { Base, CampoOrdinamento, Direzione, Modalita } from "../types";

interface Props {
  modalita: Modalita;
  base: Base;
  ruoli: string[];
  squadre: string[];
  squadra: string | null;
  sortCampo: CampoOrdinamento;
  direzione: Direzione;
  totaleRisultati: number;
  mostraPresi: boolean;
  onMostraPresiChange: (v: boolean) => void;
  onModalitaChange: (m: Modalita) => void;
  onBaseChange: (b: Base) => void;
  onRuoloToggle: (r: string) => void;
  onResetRuoli: () => void;
  onSquadraChange: (s: string | null) => void;
  onSortCampoChange: (c: CampoOrdinamento) => void;
  onDirezioneChange: (d: Direzione) => void;
  onApriFormazione: () => void;
  onResetFiltri: () => void;
  onClose: () => void;
}

const CAMPI_ORDINAMENTO: { value: CampoOrdinamento; label: string }[] = [
  { value: "nome", label: "Nome" },
  { value: "squadra", label: "Squadra" },
  { value: "ruolo", label: "Ruolo" },
  { value: "quotazioneAsta", label: "Quotazione" },
  { value: "fantaValoreMedio", label: "Fantavalore medio" },
];

export function FiltriSheet(props: Props) {
  const { onClose } = props;

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

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Filtri"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <button type="button" className="link-btn" onClick={props.onResetFiltri}>
            Azzera
          </button>
          <h2>Filtri</h2>
          <button type="button" className="link-btn forte" onClick={onClose}>
            Fatto
          </button>
        </div>

        <div className="sheet-body">
          <section>
            <h3>Modalità e base</h3>
            <FiltriBar
              modalita={props.modalita}
              base={props.base}
              onModalitaChange={props.onModalitaChange}
              onBaseChange={props.onBaseChange}
            />
          </section>

          <section>
            <h3>Ruolo</h3>
            <RuoloSelector
              modalita={props.modalita}
              ruoli={props.ruoli}
              onRuoloToggle={props.onRuoloToggle}
              onReset={props.onResetRuoli}
            />
          </section>

          <section>
            <h3>Squadra</h3>
            <div className="squadra-row">
              <SquadraSelector squadre={props.squadre} squadra={props.squadra} onSquadraChange={props.onSquadraChange} />
              {props.squadra && (
                <button type="button" className="btn" onClick={props.onApriFormazione}>
                  Formazione
                </button>
              )}
            </div>
          </section>

          <section>
            <h3>Giocatori già presi</h3>
            <div className="toggle-group filtri-larga" role="group" aria-label="Giocatori già presi">
              <button
                type="button"
                className={!props.mostraPresi ? "toggle active" : "toggle"}
                onClick={() => props.onMostraPresiChange(false)}
              >
                Nascondi
              </button>
              <button
                type="button"
                className={props.mostraPresi ? "toggle active" : "toggle"}
                onClick={() => props.onMostraPresiChange(true)}
              >
                Mostra
              </button>
            </div>
          </section>

          <section>
            <h3>Ordina per</h3>
            <div className="ordina-row">
              <select
                className="squadra-select"
                value={props.sortCampo}
                onChange={(e) => props.onSortCampoChange(e.currentTarget.value as CampoOrdinamento)}
                aria-label="Campo di ordinamento"
              >
                {CAMPI_ORDINAMENTO.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="toggle-group" role="group" aria-label="Direzione">
                <button
                  type="button"
                  className={props.direzione === "asc" ? "toggle active" : "toggle"}
                  onClick={() => props.onDirezioneChange("asc")}
                >
                  ▲ Cresc.
                </button>
                <button
                  type="button"
                  className={props.direzione === "desc" ? "toggle active" : "toggle"}
                  onClick={() => props.onDirezioneChange("desc")}
                >
                  ▼ Decr.
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3>Backup dati</h3>
            <BackupDati />
          </section>
        </div>

        <div className="sheet-footer">
          <button type="button" className="btn primario pieno" onClick={onClose}>
            Mostra {props.totaleRisultati} giocatori
          </button>
        </div>
      </div>
    </div>
  );
}
