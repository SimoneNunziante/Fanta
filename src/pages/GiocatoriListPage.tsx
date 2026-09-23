import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { GiocatoreCard } from "../components/GiocatoreCard";
import { FiltriSheet } from "../components/FiltriSheet";
import { FormazioneModal } from "../components/FormazioneModal";
import { fetchGiocatori, aggiornaSpesaMassima, aggiornaPriorita } from "../api";
import { formazioneUrl } from "../formazioni";
import { fetchPreferiti, aggiungiPreferito, rimuoviPreferito } from "../preferiti";
import type { Base, CampoOrdinamento, Direzione, Giocatore, Modalita, Priorita } from "../types";
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

/** Quante card rendere per volta: le successive arrivano scorrendo (scroll continuo). */
const BLOCCO_CARD = 40;

const ETICHETTE_ORDINAMENTO: Record<CampoOrdinamento, string> = {
  nome: "Nome",
  squadra: "Squadra",
  quotazioneAsta: "Quot.",
  fantaValoreMedio: "FVM",
};

interface Props {
  soloPreferiti?: boolean;
}

export function GiocatoriListPage({ soloPreferiti = false }: Props) {
  const [modalita, setModalita] = useState<Modalita>("CLASSICO");
  const [base, setBase] = useState<Base>("MILLE");
  const [ruoli, setRuoli] = useState<string[]>([]);
  const [squadra, setSquadra] = useState<string | null>(null);
  const [formazioneAperta, setFormazioneAperta] = useState(false);
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

  const squadreDisponibili = useMemo(
    () => Array.from(new Set(giocatori.map((g) => g.squadra))).sort((a, b) => a.localeCompare(b, "it")),
    [giocatori]
  );

  const giocatoriFiltrati = useMemo(() => {
    let risultato = soloPreferiti ? giocatori.filter((g) => preferiti.has(g.id)) : giocatori;
    if (ruoli.length > 0) {
      risultato = risultato.filter((g) => ruoli.every((r) => g.ruolo.includes(r)));
    }
    if (squadra) {
      risultato = risultato.filter((g) => g.squadra === squadra);
    }
    const query = normalizza(ricerca.trim());
    if (query) {
      risultato = risultato.filter((g) => normalizza(g.nome).includes(query));
    }
    return risultato;
  }, [giocatori, soloPreferiti, preferiti, ruoli, squadra, ricerca]);

  const giocatoriOrdinati = useMemo(() => {
    const ordinati = [...giocatoriFiltrati].sort((a, b) => confronta(a, b, sortCampo));
    return direzione === "asc" ? ordinati : ordinati.reverse();
  }, [giocatoriFiltrati, sortCampo, direzione]);

  const giocatoriVisibili = giocatoriOrdinati.slice(0, visibili);
  const altriDaMostrare = giocatoriVisibili.length < giocatoriOrdinati.length;

  useEffect(() => {
    setVisibili(BLOCCO_CARD);
    window.scrollTo({ top: 0 });
  }, [modalita, base, ruoli, squadra, ricerca, soloPreferiti, sortCampo, direzione]);

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

  const filtriAttivi = ruoli.length + (squadra ? 1 : 0);
  const riepilogo = [
    modalita === "CLASSICO" ? "Classico" : "Mantra",
    base === "MILLE" ? "1000" : "500",
    ruoli.length > 0 ? ruoli.join("+") : null,
    squadra,
    `${ETICHETTE_ORDINAMENTO[sortCampo]} ${direzione === "asc" ? "▲" : "▼"}`,
  ].filter(Boolean);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-riga">
          <div className="ricerca">
            <input
              type="search"
              className="ricerca-input"
              placeholder="Cerca…"
              value={ricerca}
              onChange={(e) => setRicerca(e.currentTarget.value)}
              enterKeyHint="search"
            />
            {ricerca && (
              <button type="button" className="ricerca-clear" aria-label="Svuota ricerca" onClick={() => setRicerca("")}>
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
          {riepilogo.join(" · ")} — <strong>{giocatoriOrdinati.length}</strong>
        </button>
      </header>

      <main className="lista-contenitore">
        {errore && <p className="errore">{errore}</p>}
        {caricamento && giocatori.length === 0 ? (
          <p className="vuoto">Caricamento…</p>
        ) : giocatoriOrdinati.length === 0 ? (
          <p className="vuoto">
            {soloPreferiti && preferiti.size === 0
              ? "Nessun preferito ancora: tocca ☆ su un giocatore del listone."
              : "Nessun giocatore trovato con questi filtri."}
          </p>
        ) : (
          <ul className="lista">
            {giocatoriVisibili.map((g) => (
              <GiocatoreCard
                key={g.id}
                giocatore={g}
                preferito={preferiti.has(g.id)}
                mostraDatiAsta={soloPreferiti}
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
          <span className="tab-icona">★</span>
          Preferiti ({preferiti.size})
        </NavLink>
      </nav>

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
          onModalitaChange={handleModalitaChange}
          onBaseChange={setBase}
          onRuoloToggle={handleRuoloToggle}
          onResetRuoli={() => setRuoli([])}
          onSquadraChange={setSquadra}
          onSortCampoChange={setSortCampo}
          onDirezioneChange={setDirezione}
          onApriFormazione={() => {
            setFiltriAperti(false);
            setFormazioneAperta(true);
          }}
          onResetFiltri={handleResetFiltri}
          onClose={() => setFiltriAperti(false)}
        />
      )}
      {formazioneAperta && squadra && (
        <FormazioneModal
          squadra={squadra}
          url={formazioneUrl(squadra)}
          onClose={() => setFormazioneAperta(false)}
        />
      )}
    </div>
  );
}
