import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiltriBar } from "../components/FiltriBar";
import { RuoloSelector } from "../components/RuoloSelector";
import { SquadraSelector } from "../components/SquadraSelector";
import { GiocatoriTable } from "../components/GiocatoriTable";
import { FormazioneModal } from "../components/FormazioneModal";
import { BackupDati } from "../components/BackupDati";
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

const RISULTATI_PER_PAGINA = 15;

interface Props {
  soloPreferiti?: boolean;
}

export function GiocatoriListPage({ soloPreferiti = false }: Props) {
  const [modalita, setModalita] = useState<Modalita>("CLASSICO");
  const [base, setBase] = useState<Base>("MILLE");
  const [ruoli, setRuoli] = useState<string[]>([]);
  const [squadra, setSquadra] = useState<string | null>(null);
  const [formazioneAperta, setFormazioneAperta] = useState(false);
  const [ricerca, setRicerca] = useState("");
  const [sortCampo, setSortCampo] = useState<CampoOrdinamento>("nome");
  const [direzione, setDirezione] = useState<Direzione>("asc");
  const [pagina, setPagina] = useState(1);
  const [filtriAperti, setFiltriAperti] = useState(true);
  const [giocatori, setGiocatori] = useState<Giocatore[]>([]);
  const [preferiti, setPreferiti] = useState<Set<number>>(new Set());
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  function handleModalitaChange(nuovaModalita: Modalita) {
    setModalita(nuovaModalita);
    setRuoli([]);
  }

  function handleRuoloToggle(r: string) {
    setRuoli((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function handleSortChange(campo: CampoOrdinamento) {
    if (campo === sortCampo) {
      setDirezione((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCampo(campo);
      setDirezione("asc");
    }
  }

  async function handleAggiungiPreferito(giocatoreId: number) {
    setPreferiti((prev) => new Set(prev).add(giocatoreId));
    try {
      await aggiungiPreferito(giocatoreId);
    } catch (err) {
      setPreferiti((prev) => {
        const nuovo = new Set(prev);
        nuovo.delete(giocatoreId);
        return nuovo;
      });
      setErrore(err instanceof Error ? err.message : "Errore nell'aggiunta ai preferiti");
    }
  }

  async function handleRimuoviPreferito(giocatoreId: number) {
    setPreferiti((prev) => {
      const nuovo = new Set(prev);
      nuovo.delete(giocatoreId);
      return nuovo;
    });
    try {
      await rimuoviPreferito(giocatoreId);
    } catch (err) {
      setPreferiti((prev) => new Set(prev).add(giocatoreId));
      setErrore(err instanceof Error ? err.message : "Errore nella rimozione dai preferiti");
    }
  }

  async function handleSalvaSpesaMassima(giocatoreId: number, valore: number | null) {
    const precedente = giocatori.find((g) => g.id === giocatoreId)?.spesaMassima ?? null;
    setGiocatori((prev) =>
      prev.map((g) => (g.id === giocatoreId ? { ...g, spesaMassima: valore } : g))
    );
    try {
      await aggiornaSpesaMassima(giocatoreId, valore);
    } catch (err) {
      setGiocatori((prev) =>
        prev.map((g) => (g.id === giocatoreId ? { ...g, spesaMassima: precedente } : g))
      );
      setErrore(err instanceof Error ? err.message : "Errore nel salvataggio della spesa massima");
    }
  }

  async function handleSalvaPriorita(giocatoreId: number, valore: Priorita | null) {
    const precedente = giocatori.find((g) => g.id === giocatoreId)?.priorita ?? null;
    setGiocatori((prev) => prev.map((g) => (g.id === giocatoreId ? { ...g, priorita: valore } : g)));
    try {
      await aggiornaPriorita(giocatoreId, valore);
    } catch (err) {
      setGiocatori((prev) =>
        prev.map((g) => (g.id === giocatoreId ? { ...g, priorita: precedente } : g))
      );
      setErrore(err instanceof Error ? err.message : "Errore nel salvataggio della priorita");
    }
  }

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

  const totalePagine = Math.max(1, Math.ceil(giocatoriOrdinati.length / RISULTATI_PER_PAGINA));
  const paginaCorrente = Math.min(pagina, totalePagine);
  const giocatoriPagina = useMemo(
    () =>
      giocatoriOrdinati.slice(
        (paginaCorrente - 1) * RISULTATI_PER_PAGINA,
        paginaCorrente * RISULTATI_PER_PAGINA
      ),
    [giocatoriOrdinati, paginaCorrente]
  );

  useEffect(() => {
    setPagina(1);
  }, [modalita, base, ruoli, squadra, ricerca, soloPreferiti]);

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

  return (
    <main className="container">
      <h1>Fanta</h1>
      <nav className="nav-preferiti">
        {soloPreferiti ? (
          <Link to="/" className="toggle">
            ← Torna al listone
          </Link>
        ) : (
          <Link to="/preferiti" className="toggle">
            ★ Preferiti ({preferiti.size})
          </Link>
        )}
      </nav>
      <button type="button" className="filtri-toggle" onClick={() => setFiltriAperti((a) => !a)}>
        {filtriAperti ? "Nascondi filtri ▲" : "Mostra filtri ▼"}
      </button>
      {filtriAperti && (
        <>
          <FiltriBar
            modalita={modalita}
            base={base}
            onModalitaChange={handleModalitaChange}
            onBaseChange={setBase}
          />
          <RuoloSelector
            modalita={modalita}
            ruoli={ruoli}
            onRuoloToggle={handleRuoloToggle}
            onReset={() => setRuoli([])}
          />
          <div className="squadra-row">
            <SquadraSelector squadre={squadreDisponibili} squadra={squadra} onSquadraChange={setSquadra} />
            {squadra && (
              <button type="button" className="toggle" onClick={() => setFormazioneAperta(true)}>
                Preview formazione
              </button>
            )}
          </div>
          <input
            type="search"
            className="ricerca-input"
            placeholder="Cerca giocatore..."
            value={ricerca}
            onChange={(e) => setRicerca(e.currentTarget.value)}
          />
        </>
      )}
      {formazioneAperta && squadra && (
        <FormazioneModal
          squadra={squadra}
          url={formazioneUrl(squadra)}
          onClose={() => setFormazioneAperta(false)}
        />
      )}
      {errore && <p className="errore">{errore}</p>}
      {caricamento ? (
        <p>Caricamento...</p>
      ) : soloPreferiti && giocatoriOrdinati.length === 0 ? (
        <p>Nessun preferito ancora.</p>
      ) : (
        <>
          <GiocatoriTable
            giocatori={giocatoriPagina}
            sortCampo={sortCampo}
            direzione={direzione}
            onSortChange={handleSortChange}
            soloPreferiti={soloPreferiti}
            preferiti={preferiti}
            onAggiungiPreferito={handleAggiungiPreferito}
            onRimuoviPreferito={handleRimuoviPreferito}
            onSalvaSpesaMassima={handleSalvaSpesaMassima}
            onSalvaPriorita={handleSalvaPriorita}
          />
          {totalePagine > 1 && (
            <div className="paginazione">
              <button
                type="button"
                className="pagina-btn"
                onClick={() => setPagina((p) => p - 1)}
                disabled={paginaCorrente <= 1}
              >
                ← Precedente
              </button>
              <span className="pagina-indicatore">
                Pagina {paginaCorrente} di {totalePagine}
              </span>
              <button
                type="button"
                className="pagina-btn"
                onClick={() => setPagina((p) => p + 1)}
                disabled={paginaCorrente >= totalePagine}
              >
                Successiva →
              </button>
            </div>
          )}
        </>
      )}
      <BackupDati />
    </main>
  );
}
