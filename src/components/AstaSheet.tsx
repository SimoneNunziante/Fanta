import { useEffect, useState } from "react";
import { coloreRuolo } from "../ruoloColori";
import { repartoDi, type RiepilogoAsta } from "../asta";
import type { GiocatoreRaw } from "../store";
import type { ConfigAsta, Modalita } from "../types";

interface Props {
  config: ConfigAsta;
  riepilogo: RiepilogoAsta;
  modalita: Modalita;
  rosa: { giocatore: GiocatoreRaw; prezzo: number }[];
  onSalvaConfig: (config: ConfigAsta) => void;
  onAzzeraAcquisti: () => void;
  onApriGiocatore: (giocatoreId: number) => void;
  onClose: () => void;
}

const ETICHETTE_REPARTO: Record<string, string> = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
  Por: "Portieri",
  Mov: "Movimento",
};

function NumeroInput({ valore, onCambia, label }: { valore: number; onCambia: (v: number) => void; label: string }) {
  const [testo, setTesto] = useState(String(valore));
  useEffect(() => setTesto(String(valore)), [valore]);
  return (
    <input
      type="text"
      inputMode="numeric"
      className="numero-input"
      aria-label={label}
      value={testo}
      onChange={(e) => setTesto(e.currentTarget.value.replace(/[^0-9]/g, "").slice(0, 4))}
      onBlur={() => {
        const n = Number(testo);
        if (testo !== "" && n !== valore) onCambia(n);
        else setTesto(String(valore));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function AstaSheet({
  config,
  riepilogo,
  modalita,
  rosa,
  onSalvaConfig,
  onAzzeraAcquisti,
  onApriGiocatore,
  onClose,
}: Props) {
  const [confermaAzzera, setConfermaAzzera] = useState(false);

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

  const chiaveSlot = modalita === "CLASSICO" ? "slotClassico" : "slotMantra";
  const slot: Record<string, number> = config[chiaveSlot];

  function cambiaSlot(reparto: string, valore: number) {
    onSalvaConfig({ ...config, [chiaveSlot]: { ...slot, [reparto]: valore } });
  }

  const rosaPerReparto = riepilogo.reparti.map((r) => ({
    ...r,
    giocatori: rosa
      .filter((x) => repartoDi(x.giocatore, modalita) === r.reparto)
      .sort((a, b) => b.prezzo - a.prezzo),
  }));

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Asta" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="link-btn" aria-hidden="true" />
          <h2>Asta</h2>
          <button type="button" className="link-btn forte" onClick={onClose}>
            Fatto
          </button>
        </div>

        <div className="sheet-body">
          <section>
            <div className="dettaglio-kpi">
              <div>
                <small>Residuo</small>
                <strong>{riepilogo.residuo}</strong>
              </div>
              <div>
                <small>Spendibile</small>
                <strong>{riepilogo.maxSpendibile}</strong>
              </div>
              <div>
                <small>Slot</small>
                <strong>{riepilogo.slotMancanti}</strong>
              </div>
            </div>
          </section>

          <section>
            <h3>La mia rosa ({modalita === "CLASSICO" ? "Classico" : "Mantra"})</h3>
            {rosaPerReparto.map((r) => (
              <div key={r.reparto} className="rosa-reparto">
                <div className="rosa-reparto-titolo">
                  {ETICHETTE_REPARTO[r.reparto] ?? r.reparto}
                  <span className={r.presi >= r.totale ? "rosa-conteggio completo" : "rosa-conteggio"}>
                    {r.presi}/{r.totale}
                  </span>
                </div>
                {r.giocatori.length === 0 ? (
                  <p className="rosa-vuota">Nessuno ancora</p>
                ) : (
                  <ul className="rosa-lista">
                    {r.giocatori.map(({ giocatore, prezzo }) => (
                      <li key={giocatore.id}>
                        <button type="button" className="rosa-riga" onClick={() => onApriGiocatore(giocatore.id)}>
                          <span className="ruolo-badges">
                            {(modalita === "CLASSICO" ? [giocatore.ruoloClassico] : giocatore.ruoliMantra).map((x) => (
                              <span key={x} className="ruolo-badge" data-colore={coloreRuolo(x)}>
                                {x}
                              </span>
                            ))}
                          </span>
                          <span className="rosa-nome">{giocatore.nome}</span>
                          <strong>{prezzo}</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>

          <section>
            <h3>Regole dell'asta</h3>
            <div className="config-grid">
              <label>
                Budget
                <NumeroInput valore={config.budget} label="Budget" onCambia={(v) => onSalvaConfig({ ...config, budget: v })} />
              </label>
              {Object.keys(slot).map((reparto) => (
                <label key={reparto}>
                  {ETICHETTE_REPARTO[reparto] ?? reparto}
                  <NumeroInput valore={slot[reparto]} label={`Slot ${reparto}`} onCambia={(v) => cambiaSlot(reparto, v)} />
                </label>
              ))}
            </div>
            <div className="azioni-row">
              <button type="button" className="btn" onClick={() => onSalvaConfig({ ...config, budget: 500 })}>
                Budget 500
              </button>
              <button type="button" className="btn" onClick={() => onSalvaConfig({ ...config, budget: 1000 })}>
                Budget 1000
              </button>
            </div>
            <p className="nota">
              Gli slot si riferiscono alla modalità attiva ({modalita === "CLASSICO" ? "Classico" : "Mantra"}): cambiala dai
              filtri per configurare l'altra.
            </p>
          </section>

          <section>
            <h3>Nuova asta</h3>
            <button
              type="button"
              className={confermaAzzera ? "btn pieno pericolo" : "btn pieno"}
              onClick={() => {
                if (confermaAzzera) {
                  onAzzeraAcquisti();
                  setConfermaAzzera(false);
                } else {
                  setConfermaAzzera(true);
                }
              }}
            >
              {confermaAzzera ? "Tocca di nuovo per confermare" : "Azzera acquisti"}
            </button>
            <p className="nota">Preferiti, max, priorità e regole restano.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
