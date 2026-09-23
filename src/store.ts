import type { Priorita } from "./types";

/**
 * Sostituisce il backend Quarkus + Postgres: i dati dei giocatori sono statici
 * (public/data/giocatori.json, esportato dalle migration V1.0-V1.5), mentre i dati
 * dell'utente (preferiti, spesa massima, priorita) vivono nel localStorage del browser.
 */

export interface GiocatoreRaw {
  id: number;
  idEsterno: number;
  nome: string;
  squadra: string;
  ruoloClassico: string;
  ruoliMantra: string[];
  qaClassico1000: number;
  qaClassico500: number;
  qaMantra1000: number;
  qaMantra500: number;
  fvmClassico: number | null;
  fvmMantra: number | null;
}

export interface DatiUtente {
  preferiti: number[];
  spesaMassima: Record<string, number>;
  priorita: Record<string, Priorita>;
}

interface DatiStatici {
  giocatori: GiocatoreRaw[];
  datiIniziali: DatiUtente;
}

const CHIAVE_STORAGE = "fantamantra.datiUtente.v1";

let datiStatici: Promise<DatiStatici> | null = null;

function caricaDatiStatici(): Promise<DatiStatici> {
  if (!datiStatici) {
    datiStatici = fetch(`${import.meta.env.BASE_URL}data/giocatori.json`).then((res) => {
      if (!res.ok) {
        datiStatici = null;
        throw new Error(`Errore nel caricamento giocatori (${res.status})`);
      }
      return res.json();
    });
  }
  return datiStatici;
}

export async function leggiGiocatori(): Promise<GiocatoreRaw[]> {
  return (await caricaDatiStatici()).giocatori;
}

export async function esisteGiocatore(id: number): Promise<boolean> {
  return (await leggiGiocatori()).some((g) => g.id === id);
}

export async function leggiDatiUtente(): Promise<DatiUtente> {
  const salvati = localStorage.getItem(CHIAVE_STORAGE);
  if (salvati) {
    return normalizzaDatiUtente(JSON.parse(salvati));
  }
  return structuredClone((await caricaDatiStatici()).datiIniziali);
}

export function salvaDatiUtente(dati: DatiUtente): void {
  localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(dati));
}

export async function modificaDatiUtente(modifica: (dati: DatiUtente) => void): Promise<void> {
  const dati = await leggiDatiUtente();
  modifica(dati);
  salvaDatiUtente(dati);
}

/** Valida un backup importato (o letto dallo storage) e lo riporta alla forma attesa. */
export function normalizzaDatiUtente(valore: unknown): DatiUtente {
  const v = valore as Partial<DatiUtente> | null;
  if (!v || typeof v !== "object" || !Array.isArray(v.preferiti)) {
    throw new Error("File di backup non valido");
  }
  return {
    preferiti: v.preferiti.filter((id): id is number => typeof id === "number"),
    spesaMassima: v.spesaMassima ?? {},
    priorita: v.priorita ?? {},
  };
}
