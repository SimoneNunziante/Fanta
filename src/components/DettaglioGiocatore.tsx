import { useEffect, useState } from "react";
import { coloreRuolo } from "../ruoloColori";
import { repartoPieno, type RiepilogoAsta } from "../asta";
import type { GiocatoreRaw } from "../store";
import { SpesaMassimaInput } from "./SpesaMassimaInput";
import type { Acquisto, Base, Modalita, Priorita } from "../types";

interface Props {
  giocatore: GiocatoreRaw;
  modalita: Modalita;
  base: Base;
  preferito: boolean;
  spesaMassima: number | null;
  priorita: Priorita | null;
  acquisto: Acquisto | null;
  riepilogo: RiepilogoAsta;
  onTogglePreferito: (giocatoreId: number, preferito: boolean) => void;
  onSalvaSpesaMassima: (giocatoreId: number, valore: number | null) => void;
  onSalvaPriorita: (giocatoreId: number, valore: Priorita | null) => void;
  onSalvaAcquisto: (giocatoreId: number, acquisto: Acquisto | null) => void;
  onApriFormazione: (squadra: string) => void;
  onClose: () => void;
}

const PRIORITA: { valore: Priorita; label: string }[] = [
  { valore: "VERDE", label: "Alta" },
  { valore: "GIALLO", label: "Media" },
  { valore: "ROSSO", label: "Bassa" },
];

/** Con base 500 il fantavalore (espresso su 1000) si dimezza arrotondando per eccesso, come nel backend. */
function perBase(valoreMille: number | null, base: Base): number | null {
  if (valoreMille == null) return null;
  return base === "MILLE" ? valoreMille : Math.floor((valoreMille + 1) / 2);
}

function Badges({ ruoli }: { ruoli: string[] }) {
  return (
    <span className="ruolo-badges">
      {ruoli.map((r) => (
        <span key={r} className="ruolo-badge" data-colore={coloreRuolo(r)}>
          {r}
        </span>
      ))}
    </span>
  );
}

export function DettaglioGiocatore({
  giocatore: g,
  modalita,
  base,
  preferito,
  spesaMassima,
  priorita,
  acquisto,
  riepilogo,
  onTogglePreferito,
  onSalvaSpesaMassima,
  onSalvaPriorita,
  onSalvaAcquisto,
  onApriFormazione,
  onClose,
}: Props) {
  const [prezzo, setPrezzo] = useState(acquisto?.prezzo != null ? String(acquisto.prezzo) : "");

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

  const prezzoNum = prezzo === "" ? null : Number(prezzo);
  const pieno = acquisto?.stato !== "MIO" && repartoPieno(riepilogo, g, modalita);
  const avvisi: { livello: "rosso" | "arancio"; testo: string }[] = [];
  if (pieno) avvisi.push({ livello: "rosso", testo: "Reparto già completo nella tua rosa" });
  if (prezzoNum != null && acquisto?.stato !== "MIO") {
    if (prezzoNum > riepilogo.maxSpendibile) {
      avvisi.push({ livello: "rosso", testo: `Oltre il massimo spendibile (${riepilogo.maxSpendibile})` });
    }
    if (spesaMassima != null && prezzoNum > spesaMassima) {
      avvisi.push({ livello: "arancio", testo: `Oltre il tuo max (${spesaMassima})` });
    }
  }

  const altraBase: Base = base === "MILLE" ? "CINQUECENTO" : "MILLE";
  const etichettaBase = (b: Base) => (b === "MILLE" ? "1000" : "500");
  const valori = [
    {
      nome: "Classico",
      attiva: modalita === "CLASSICO",
      ruoli: [g.ruoloClassico],
      quot: { MILLE: g.qaClassico1000, CINQUECENTO: g.qaClassico500 },
      fvm: g.fvmClassico,
    },
    {
      nome: "Mantra",
      attiva: modalita === "MANTRA",
      ruoli: g.ruoliMantra,
      quot: { MILLE: g.qaMantra1000, CINQUECENTO: g.qaMantra500 },
      fvm: g.fvmMantra,
    },
  ];

  function segnaMio() {
    if (prezzoNum == null) return;
    onSalvaAcquisto(g.id, { stato: "MIO", prezzo: prezzoNum });
    onClose();
  }

  function segnaAltri() {
    onSalvaAcquisto(g.id, { stato: "ALTRI", prezzo: prezzoNum });
    onClose();
  }

  return (
    <div className="dettaglio" role="dialog" aria-modal="true" aria-label={`Dettaglio ${g.nome}`}>
      <div className="dettaglio-header">
        <button type="button" className="link-btn" onClick={onClose}>
          ← Indietro
        </button>
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

      <div className="dettaglio-body">
        <h2 className="dettaglio-nome">{g.nome}</h2>
        <div className="card-sottotitolo">
          <Badges ruoli={modalita === "CLASSICO" ? [g.ruoloClassico] : g.ruoliMantra} />
          <span className="card-squadra">{g.squadra}</span>
        </div>

        {acquisto && (
          <div className="dettaglio-stato" data-stato={acquisto.stato.toLowerCase()}>
            {acquisto.stato === "MIO" ? `Nella tua rosa a ${acquisto.prezzo}` : "Preso da un altro"}
            {acquisto.stato === "ALTRI" && acquisto.prezzo != null && ` a ${acquisto.prezzo}`}
          </div>
        )}

        <div className="dettaglio-kpi">
          <div>
            <small>Max</small>
            <strong>{spesaMassima ?? "—"}</strong>
          </div>
          <div>
            <small>Spendibile</small>
            <strong>{riepilogo.maxSpendibile}</strong>
          </div>
          <div>
            <small>Residuo</small>
            <strong>{riepilogo.residuo}</strong>
          </div>
        </div>

        <div className="dettaglio-valori">
          {valori.map((v) => (
            <div key={v.nome} className={v.attiva ? "valori-box attivo" : "valori-box"}>
              <div className="valori-titolo">
                {v.nome} <Badges ruoli={v.ruoli} />
              </div>
              <div className="valori-numeri">
                <span>
                  <small>Quot.</small> <strong>{v.quot[base]}</strong>
                </span>
                <span>
                  <small>FVM</small> <strong>{perBase(v.fvm, base) ?? "—"}</strong>
                </span>
              </div>
              <div className="valori-altra-base">
                Base {etichettaBase(altraBase)}: quot. {v.quot[altraBase]} · FVM {perBase(v.fvm, altraBase) ?? "—"}
              </div>
            </div>
          ))}
        </div>

        <section className="dettaglio-sezione">
          <h3>Asta</h3>
          <div className="prezzo-row">
            <input
              type="text"
              inputMode="numeric"
              className="prezzo-input"
              placeholder="Prezzo"
              maxLength={4}
              value={prezzo}
              onChange={(e) => setPrezzo(e.currentTarget.value.replace(/[^0-9]/g, "").slice(0, 4))}
              aria-label="Prezzo"
            />
            <button type="button" className="btn primario" disabled={prezzoNum == null} onClick={segnaMio}>
              ✓ Mio
            </button>
          </div>
          {avvisi.map((a) => (
            <p key={a.testo} className="avviso" data-livello={a.livello}>
              {a.testo}
            </p>
          ))}
          <div className="azioni-row">
            <button type="button" className="btn" onClick={segnaAltri}>
              Preso da altri
            </button>
            {acquisto && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onSalvaAcquisto(g.id, null);
                  setPrezzo("");
                }}
              >
                Rimetti libero
              </button>
            )}
          </div>
        </section>

        <section className="dettaglio-sezione">
          <h3>Pianificazione</h3>
          <div className="card-asta">
            <label className="card-spesa">
              <small>Max</small>
              <SpesaMassimaInput valore={spesaMassima} onSalva={(v) => onSalvaSpesaMassima(g.id, v)} />
            </label>
            <div className="priorita-scelta" role="group" aria-label="Priorità">
              {PRIORITA.map((p) => (
                <button
                  key={p.valore}
                  type="button"
                  className="priorita-dot"
                  data-colore={p.valore.toLowerCase()}
                  aria-label={`Priorità ${p.label}`}
                  aria-pressed={priorita === p.valore}
                  onClick={() => onSalvaPriorita(g.id, priorita === p.valore ? null : p.valore)}
                />
              ))}
            </div>
          </div>
        </section>

        <button type="button" className="btn pieno" onClick={() => onApriFormazione(g.squadra)}>
          Formazione {g.squadra}
        </button>
      </div>
    </div>
  );
}
