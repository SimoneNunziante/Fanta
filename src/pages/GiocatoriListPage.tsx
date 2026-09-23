import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { GiocatoreCard } from "../components/GiocatoreCard";
import { FiltriSheet } from "../components/FiltriSheet";
import { FormazioneModal } from "../components/FormazioneModal";
import { DettaglioGiocatore } from "../components/DettaglioGiocatore";
import { AstaSheet } from "../components/AstaSheet";
import {
  fetchGiocatori,
  fetchGiocatoriCompleti,
  fetchDatiAsta,
  aggiornaSpesaMassima,
  aggiornaPriorita,
  aggiornaAcquisto,
  aggiornaConfigAsta,
  azzeraAcquisti,
} from "../api";
import { calcolaRiepilogo } from "../asta";
import { CONFIG_ASTA_DEFAULT, type GiocatoreRaw } from "../store";
import { formazioneUrl } from "../formazioni";
import { fetchPreferiti, aggiungiPreferito, rimuoviPreferito } from "../preferiti";
import type { Acquisto, Base, CampoOrdinamento, ConfigAsta, Direzione, Giocatore, Modalita, Priorita } from "../types";
import "../App.css";

function confronta(a: Giocatore, b: Giocatore, campo: CampoOrdinamento): number {
  if (campo === "nome" || campo === "squadra") {
    return a[campo].localeCompare(b[campo], "it", { sensitivity: "base" });
  }
  return a[campo] - b[campo];
}

/** Toglie accenti e qualsiasi carattere non alfanumerico, cosi' "N'Dicka" diventa "ndicka". */
function normalizza(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

/** Distanza di Levenshtein, per tollerare errori di battitura nella ricerca. */
function distanza(a: string, b: string): number {
  const riga = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonale = riga[0];
    riga[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const sopra = riga[j];
      riga[j] = Math.min(riga[j] + 1, riga[j - 1] + 1, diagonale + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonale = sopra;
    }
  }
  return riga[b.length];
}

function corrispondeEsatto(g: Giocatore, query: string): boolean {
  return normalizza(g.nome).includes(query) || normalizza(g.squadra).startsWith(query);
}

/** Confronta la query con l'inizio di ogni parola del nome, ammettendo 1 errore (2 dai 7 caratteri). */
function corrispondeApprossimato(g: Giocatore, query: string): boolean {
  if (query.length < 4) return false;
  const soglia = query.length >= 7 ? 2 : 1;
  return g.nome
    .split(/[\s.'-]+/)
    .map(normalizza)
    .some((parola) => parola.length >= 3 && distanza(parola.slice(0, query.length), query) <= soglia);
}

/** Quante card rendere per volta: le successive arrivano scorrendo (scroll continuo). */
const BLOCCO_CARD = 40;

const ETICHETTE_ORDINAMENTO: Record<CampoOrdinamento, string> = {
  nome: "Nome",
  squadra: "Squadra",
  quotazioneAsta: "Quot.",
  fantaValoreMedio: "FVM",
};

type FiltroPresi = "TUTTI" | "MIO" | "ALTRI";

interface Props {
  vista: "listone" | "preferiti" | "presi";
}

/** Secondi in cui resta visibile il pulsante "Annulla" dopo un'azione sull'asta. */
const DURATA_ANNULLA_MS = 6000;

export function GiocatoriListPage({ vista }: Props) {
  const soloPreferiti = vista === "preferiti";
  const soloPresi = vista === "presi";
  const [modalita, setModalita] = useState<Modalita>("CLASSICO");
  const [base, setBase] = useState<Base>("MILLE");
  const [ruoli, setRuoli] = useState<string[]>([]);
  const [squadra, setSquadra] = useState<string | null>(null);
  const [formazioneSquadra, setFormazioneSquadra] = useState<string | null>(null);
  const [dettaglioId, setDettaglioId] = useState<number | null>(null);
  const [astaAperta, setAstaAperta] = useState(false);
  const [mostraPresi, setMostraPresi] = useState(false);
  const [filtroPresi, setFiltroPresi] = useState<FiltroPresi>("TUTTI");
  const [annulla, setAnnulla] = useState<{ giocatoreId: number; testo: string; precedente: Acquisto | null } | null>(
    null,
  );
  const timerAnnullaRef = useRef<number | undefined>(undefined);
  const [daLiberare, setDaLiberare] = useState<number | null>(null);
  const [completi, setCompleti] = useState<Map<number, GiocatoreRaw>>(new Map());
  const [acquisti, setAcquisti] = useState<Record<string, Acquisto>>({});
  const [configAsta, setConfigAsta] = useState<ConfigAsta>(CONFIG_ASTA_DEFAULT);
  const [filtriAperti, setFiltriAperti] = useState(false);
  const [ricerca, setRicerca] = useState("");
  const [sortCampo, setSortCampo] = useState<CampoOrdinamento>("nome");
  const [direzione, setDirezione] = useState<Direzione>("asc");
  const [visibili, setVisibili] = useState(BLOCCO_CARD);
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [preferiti, setPreferiti] = useState<Set<number>>(new Set());
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const sentinellaRef = useRef<HTMLDivElement>(null);
  const ricercaRef = useRef<HTMLInputElement>(null);

  function handleModalitaChange(nuovaModalita: Modalita) {
    setModalita(nuovaModalita);
    setRuoli([]);
  }

  function handleRuoloToggle(r: string) {
    setRuoli((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function handleResetFiltri() {
    setRuoli([]);
    setSquadra(null);
    setSortCampo("nome");
    setDirezione("asc");
  }

  const handleTogglePreferito = useCallback(async (giocatoreId: number, eraPreferito: boolean) => {
    const applica = (aggiungi: boolean) =>
      setPreferiti((prev) => {
        const nuovo = new Set(prev);
        if (aggiungi) nuovo.add(giocatoreId);
        else nuovo.delete(giocatoreId);
        return nuovo;
      });
    applica(!eraPreferito);
    try {
      await (eraPreferito ? rimuoviPreferito(giocatoreId) : aggiungiPreferito(giocatoreId));
    } catch (err) {
      applica(eraPreferito);
      setErrore(err instanceof Error ? err.message : "Errore nel salvataggio dei preferiti");
    }
  }, []);

  /** Aggiornamento ottimistico di un campo del giocatore, con rollback se il salvataggio fallisce. */
  const aggiornaCampo = useCallback(
    async <K extends "spesaMassima" | "priorita">(
      giocatoreId: number,
      campo: K,
      valore: Giocatore[K],
      salva: () => Promise<void>,
      messaggio: string,
    ) => {
      let precedente: Giocatore[K] | undefined;
      setGiocatori((prev) =>
        prev.map((g) => {
          if (g.id !== giocatoreId) return g;
          precedente = g[campo];
          return { ...g, [campo]: valore };
        }),
      );
      try {
        await salva();
      } catch (err) {
        setGiocatori((prev) =>
          prev.map((g) => (g.id === giocatoreId ? { ...g, [campo]: precedente ?? null } : g)),
        );
        setErrore(err instanceof Error ? err.message : messaggio);
      }
    },
    [],
  );

  const handleSalvaSpesaMassima = useCallback(
    (giocatoreId: number, valore: number | null) =>
      aggiornaCampo(giocatoreId, "spesaMassima", valore, () => aggiornaSpesaMassima(giocatoreId, valore),
        "Errore nel salvataggio della spesa massima"),
    [aggiornaCampo],
  );

  const handleSalvaPriorita = useCallback(
    (giocatoreId: number, valore: Priorita | null) =>
      aggiornaCampo(giocatoreId, "priorita", valore, () => aggiornaPriorita(giocatoreId, valore),
        "Errore nel salvataggio della priorita"),
    [aggiornaCampo],
  );

  const handleSalvaAcquisto = useCallback(async (giocatoreId: number, acquisto: Acquisto | null) => {
    let precedente: Acquisto | undefined;
    setAcquisti((prev) => {
      precedente = prev[giocatoreId];
      const nuovo = { ...prev };
      if (acquisto) nuovo[giocatoreId] = acquisto;
      else delete nuovo[giocatoreId];
      return nuovo;
    });
    try {
      await aggiornaAcquisto(giocatoreId, acquisto);
    } catch (err) {
      setAcquisti((prev) => {
        const nuovo = { ...prev };
        if (precedente) nuovo[giocatoreId] = precedente;
        else delete nuovo[giocatoreId];
        return nuovo;
      });
      setErrore(err instanceof Error ? err.message : "Errore nel salvataggio dell'acquisto");
    }
  }, []);

  /** Azioni dalla scheda dettaglio: salvano e offrono per qualche secondo "Annulla". */
  function handleAcquistoConAnnulla(giocatoreId: number, acquisto: Acquisto | null) {
    const nome = completi.get(giocatoreId)?.nome ?? "Giocatore";
    const testo =
      acquisto == null
        ? `${nome} di nuovo libero`
        : acquisto.stato === "MIO"
          ? `${nome} tuo a ${acquisto.prezzo}`
          : `${nome} preso da altri`;
    setAnnulla({ giocatoreId, testo, precedente: acquisti[giocatoreId] ?? null });
    window.clearTimeout(timerAnnullaRef.current);
    timerAnnullaRef.current = window.setTimeout(() => setAnnulla(null), DURATA_ANNULLA_MS);
    handleSalvaAcquisto(giocatoreId, acquisto);
  }

  function handleAnnulla() {
    if (!annulla) return;
    window.clearTimeout(timerAnnullaRef.current);
    handleSalvaAcquisto(annulla.giocatoreId, annulla.precedente);
    setAnnulla(null);
  }

  useEffect(() => () => window.clearTimeout(timerAnnullaRef.current), []);

  async function handleSalvaConfig(config: ConfigAsta) {
    setConfigAsta(config);
    await aggiornaConfigAsta(config);
  }

  async function handleAzzeraAcquisti() {
    setAcquisti({});
    await azzeraAcquisti();
  }

  const handleApriDettaglio = useCallback((giocatoreId: number) => {
    ricercaRef.current?.blur();
    setDettaglioId(giocatoreId);
  }, []);

  const handleChiudiDettaglio = useCallback(() => {
    setDettaglioId(null);
    // Pronto per il prossimo nome chiamato: il testo cercato resta selezionato e si sovrascrive digitando.
    const input = ricercaRef.current;
    if (input && input.value) {
      input.focus();
      input.select();
    }
  }, []);

  const riepilogoAsta = useMemo(
    () => calcolaRiepilogo(configAsta, acquisti, completi, modalita),
    [configAsta, acquisti, completi, modalita],
  );

  const rosa = useMemo(
    () =>
      Object.entries(acquisti)
        .filter(([, a]) => a.stato === "MIO")
        .flatMap(([id, a]) => {
          const giocatore = completi.get(Number(id));
          return giocatore ? [{ giocatore, prezzo: a.prezzo ?? 0 }] : [];
        }),
    [acquisti, completi],
  );

  const squadreDisponibili = useMemo(
    () => Array.from(new Set(giocatori.map((g) => g.squadra))).sort((a, b) => a.localeCompare(b, "it")),
    [giocatori]
  );

  const giocatoriFiltrati = useMemo(() => {
    let risultato = soloPreferiti ? giocatori.filter((g) => preferiti.has(g.id)) : giocatori;
    if (soloPresi) {
      risultato = risultato.filter((g) => {
        const a = acquisti[g.id];
        return a != null && (filtroPresi === "TUTTI" || a.stato === filtroPresi);
      });
    } else if (!mostraPresi) {
      risultato = risultato.filter((g) => !acquisti[g.id]);
    }
    if (ruoli.length > 0) {
      risultato = risultato.filter((g) => ruoli.every((r) => g.ruolo.includes(r)));
    }
    if (squadra) {
      risultato = risultato.filter((g) => g.squadra === squadra);
    }
    const query = normalizza(ricerca.trim());
    if (query) {
      const esatti = risultato.filter((g) => corrispondeEsatto(g, query));
      risultato = esatti.length > 0 ? esatti : risultato.filter((g) => corrispondeApprossimato(g, query));
    }
    return risultato;
  }, [giocatori, soloPreferiti, soloPresi, filtroPresi, preferiti, ruoli, squadra, ricerca, mostraPresi, acquisti]);

  const giocatoriOrdinati = useMemo(() => {
    const ordinati = [...giocatoriFiltrati].sort((a, b) => confronta(a, b, sortCampo));
    return direzione === "asc" ? ordinati : ordinati.reverse();
  }, [giocatoriFiltrati, sortCampo, direzione]);

  const giocatoriVisibili = giocatoriOrdinati.slice(0, visibili);
  const altriDaMostrare = giocatoriVisibili.length < giocatoriOrdinati.length;

  useEffect(() => {
    setVisibili(BLOCCO_CARD);
    window.scrollTo({ top: 0 });
  }, [modalita, base, ruoli, squadra, ricerca, vista, sortCampo, direzione, mostraPresi, filtroPresi]);

  useEffect(() => {
    Promise.all([fetchGiocatoriCompleti(), fetchDatiAsta()])
      .then(([mappa, dati]) => {
        setCompleti(mappa);
        setAcquisti(dati.acquisti);
        setConfigAsta(dati.configAsta);
      })
      .catch((err: Error) => setErrore(err.message));
  }, []);

  // Si riaggancia a ogni blocco: se la sentinella resta visibile (lista corta, schermo alto)
  // la nuova osservazione scatta subito e carica il blocco successivo.
  useEffect(() => {
    const el = sentinellaRef.current;
    if (!el || !altriDaMostrare) return;
    const osserva = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibili((v) => v + BLOCCO_CARD);
      },
      { rootMargin: "600px" },
    );
    osserva.observe(el);
    return () => osserva.disconnect();
  }, [visibili, altriDaMostrare]);

  useEffect(() => {
    let annullato = false;
    setCaricamento(true);
    setErrore(null);
    Promise.all([fetchGiocatori(modalita, base), fetchPreferiti()])
      .then(([datiGiocatori, datiPreferiti]) => {
        if (annullato) return;
        setGiocatori(datiGiocatori);
        setPreferiti(datiPreferiti);
      })
      .catch((err: Error) => {
        if (!annullato) setErrore(err.message);
      })
      .finally(() => {
        if (!annullato) setCaricamento(false);
      });
    return () => {
      annullato = true;
    };
  }, [modalita, base]);

  const totalePresi = Object.values(acquisti).reduce(
    (acc, a) => ({
      tutti: acc.tutti + 1,
      miei: acc.miei + (a.stato === "MIO" ? 1 : 0),
      altri: acc.altri + (a.stato === "ALTRI" ? 1 : 0),
    }),
    { tutti: 0, miei: 0, altri: 0 },
  );
  const filtriAttivi = ruoli.length + (squadra ? 1 : 0) + (mostraPresi ? 1 : 0);
  const giocatoreDettaglio = dettaglioId != null ? completi.get(dettaglioId) : undefined;
  const statoDettaglio = dettaglioId != null ? giocatori.find((g) => g.id === dettaglioId) : undefined;
  const riepilogo = [
    modalita === "CLASSICO" ? "Classico" : "Mantra",
    base === "MILLE" ? "1000" : "500",
    ruoli.length > 0 ? ruoli.join("+") : null,
    squadra,
    `${ETICHETTE_ORDINAMENTO[sortCampo]} ${direzione === "asc" ? "▲" : "▼"}`,
  ].filter(Boolean);

  return (
    <div className={`app vista-${vista}`}>
      <header className="topbar">
        <div className="topbar-riga">
          <div className="ricerca">
            <input
              type="search"
              className="ricerca-input"
              placeholder="Cerca…"
              value={ricerca}
              onChange={(e) => setRicerca(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && giocatoriOrdinati.length > 0) handleApriDettaglio(giocatoriOrdinati[0].id);
              }}
              enterKeyHint="go"
              autoFocus={vista === "listone"}
              ref={ricercaRef}
            />
            {ricerca && (
              <button
                type="button"
                className="ricerca-clear"
                aria-label="Svuota ricerca"
                onClick={() => {
                  setRicerca("");
                  ricercaRef.current?.focus();
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            className="filtri-btn"
            aria-label="Apri filtri"
            onClick={() => setFiltriAperti(true)}
          >
            <span aria-hidden="true">⚙︎</span>
            {filtriAttivi > 0 && <span className="badge">{filtriAttivi}</span>}
          </button>
        </div>
        <button type="button" className="riepilogo" onClick={() => setFiltriAperti(true)}>
          <strong>{giocatoriOrdinati.length}</strong> · {riepilogo.join(" · ")}
        </button>
        <button type="button" className="stato-asta" onClick={() => setAstaAperta(true)}>
          <span className="stato-soldi">
            <span>
              💰 <strong>{riepilogoAsta.residuo}</strong>
            </span>
            <span>
              <small>max </small>
              <strong>{riepilogoAsta.maxSpendibile}</strong>
            </span>
          </span>
          <span className="stato-slot">
            {riepilogoAsta.reparti.map((r) => (
              <span key={r.reparto} className={r.presi >= r.totale ? "slot completo" : "slot"}>
                {r.reparto} {r.presi}/{r.totale}
              </span>
            ))}
          </span>
        </button>
      </header>

      <main className="lista-contenitore">
        {soloPresi && (
          <div className="toggle-group filtri-larga filtro-presi" role="group" aria-label="Quali giocatori presi">
            {(
              [
                ["TUTTI", "Tutti", totalePresi.tutti],
                ["MIO", "Miei", totalePresi.miei],
                ["ALTRI", "Altri", totalePresi.altri],
              ] as [FiltroPresi, string, number][]
            ).map(([valore, label, conteggio]) => (
              <button
                key={valore}
                type="button"
                className={filtroPresi === valore ? "toggle active" : "toggle"}
                onClick={() => setFiltroPresi(valore)}
              >
                {label}
                <small>{conteggio}</small>
              </button>
            ))}
          </div>
        )}
        {errore && <p className="errore">{errore}</p>}
        {caricamento && giocatori.length === 0 ? (
          <p className="vuoto">Caricamento…</p>
        ) : giocatoriOrdinati.length === 0 ? (
          <p className="vuoto">
            {soloPreferiti && preferiti.size === 0
              ? "Nessun preferito ancora: tocca ☆ su un giocatore del listone."
              : soloPresi && totalePresi.tutti === 0
                ? "Nessun giocatore preso ancora: segnalo dalla sua scheda con ✓ Mio o Preso da altri."
                : "Nessun giocatore trovato con questi filtri."}
          </p>
        ) : (
          <ul className="lista">
            {giocatoriVisibili.map((g) => (
              <GiocatoreCard
                key={g.id}
                giocatore={g}
                preferito={preferiti.has(g.id)}
                acquisto={acquisti[g.id] ?? null}
                mostraDatiAsta={soloPreferiti}
                onApri={handleApriDettaglio}
                onLibera={soloPresi ? setDaLiberare : undefined}
                onTogglePreferito={handleTogglePreferito}
                onSalvaSpesaMassima={handleSalvaSpesaMassima}
                onSalvaPriorita={handleSalvaPriorita}
              />
            ))}
          </ul>
        )}
        {altriDaMostrare && (
          <div ref={sentinellaRef} className="sentinella">
            <button type="button" className="btn pieno" onClick={() => setVisibili((v) => v + BLOCCO_CARD)}>
              Mostra altri ({giocatoriOrdinati.length - giocatoriVisibili.length})
            </button>
          </div>
        )}
      </main>

      <nav className="tabbar">
        <NavLink to="/" end className="tab">
          <span className="tab-icona">☰</span>
          Listone
        </NavLink>
        <NavLink to="/preferiti" className="tab">
          <span className="tab-icona">
            ★<span className="tab-conta">{preferiti.size}</span>
          </span>
          Preferiti
        </NavLink>
        <NavLink to="/presi" className="tab">
          <span className="tab-icona">
            ✓<span className="tab-conta">{totalePresi.tutti}</span>
          </span>
          Presi
        </NavLink>
      </nav>

      {daLiberare != null && (
        <div className="conferma-backdrop" onClick={() => setDaLiberare(null)}>
          <div className="conferma" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p>
              Rimettere libero <strong>{completi.get(daLiberare)?.nome}</strong>?
              <br />
              {acquisti[daLiberare]?.stato === "MIO"
                ? `Torna disponibile e ti vengono restituiti ${acquisti[daLiberare]?.prezzo ?? 0} crediti.`
                : "Torna disponibile nel listone."}
            </p>
            <div className="conferma-azioni">
              <button type="button" className="btn" onClick={() => setDaLiberare(null)}>
                No
              </button>
              <button
                type="button"
                className="btn pericolo"
                onClick={() => {
                  handleAcquistoConAnnulla(daLiberare, null);
                  setDaLiberare(null);
                }}
              >
                Sì, libera
              </button>
            </div>
          </div>
        </div>
      )}
      {annulla && (
        <div className="toast" role="status">
          <span className="toast-testo">{annulla.testo}</span>
          <button type="button" className="toast-btn" onClick={handleAnnulla}>
            Annulla
          </button>
        </div>
      )}

      {filtriAperti && (
        <FiltriSheet
          modalita={modalita}
          base={base}
          ruoli={ruoli}
          squadre={squadreDisponibili}
          squadra={squadra}
          sortCampo={sortCampo}
          direzione={direzione}
          totaleRisultati={giocatoriOrdinati.length}
          mostraPresi={mostraPresi}
          onMostraPresiChange={setMostraPresi}
          onModalitaChange={handleModalitaChange}
          onBaseChange={setBase}
          onRuoloToggle={handleRuoloToggle}
          onResetRuoli={() => setRuoli([])}
          onSquadraChange={setSquadra}
          onSortCampoChange={setSortCampo}
          onDirezioneChange={setDirezione}
          onApriFormazione={() => {
            setFiltriAperti(false);
            setFormazioneSquadra(squadra);
          }}
          onResetFiltri={handleResetFiltri}
          onClose={() => setFiltriAperti(false)}
        />
      )}
      {giocatoreDettaglio && (
        <DettaglioGiocatore
          key={giocatoreDettaglio.id}
          giocatore={giocatoreDettaglio}
          modalita={modalita}
          base={base}
          preferito={preferiti.has(giocatoreDettaglio.id)}
          spesaMassima={statoDettaglio?.spesaMassima ?? null}
          priorita={statoDettaglio?.priorita ?? null}
          acquisto={acquisti[giocatoreDettaglio.id] ?? null}
          riepilogo={riepilogoAsta}
          onTogglePreferito={handleTogglePreferito}
          onSalvaSpesaMassima={handleSalvaSpesaMassima}
          onSalvaPriorita={handleSalvaPriorita}
          onSalvaAcquisto={handleAcquistoConAnnulla}
          onApriFormazione={setFormazioneSquadra}
          onClose={handleChiudiDettaglio}
        />
      )}
      {astaAperta && (
        <AstaSheet
          config={configAsta}
          riepilogo={riepilogoAsta}
          modalita={modalita}
          rosa={rosa}
          onSalvaConfig={handleSalvaConfig}
          onAzzeraAcquisti={handleAzzeraAcquisti}
          onApriGiocatore={(id) => {
            setAstaAperta(false);
            setDettaglioId(id);
          }}
          onClose={() => setAstaAperta(false)}
        />
      )}
      {formazioneSquadra && (
        <FormazioneModal
          squadra={formazioneSquadra}
          url={formazioneUrl(formazioneSquadra)}
          onClose={() => setFormazioneSquadra(null)}
        />
      )}
    </div>
  );
}
