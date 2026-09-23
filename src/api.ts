import type { Acquisto, Base, ConfigAsta, Giocatore, Modalita, Priorita } from "./types";
import { esisteGiocatore, leggiDatiUtente, leggiGiocatori, modificaDatiUtente, type GiocatoreRaw } from "./store";

const PRIORITA_VALIDE: Priorita[] = ["VERDE", "GIALLO", "ROSSO"];

/** Con base CINQUECENTO dimezza il valore, arrotondando per eccesso se dispari. */
function risolviPerBase(valoreMille: number | null, base: Base): number | null {
  if (valoreMille == null || base === "MILLE") {
    return valoreMille;
  }
  return Math.floor((valoreMille + 1) / 2);
}

export async function fetchGiocatori(modalita: Modalita, base: Base): Promise<Giocatore[]> {
  const [giocatori, datiUtente] = await Promise.all([leggiGiocatori(), leggiDatiUtente()]);
  return giocatori.map((g) => {
    const classico = modalita === "CLASSICO";
    return {
      id: g.id,
      idEsterno: g.idEsterno,
      nome: g.nome,
      squadra: g.squadra,
      ruolo: classico ? [g.ruoloClassico] : g.ruoliMantra,
      quotazioneAsta: classico
        ? base === "MILLE" ? g.qaClassico1000 : g.qaClassico500
        : base === "MILLE" ? g.qaMantra1000 : g.qaMantra500,
      fantaValoreMedio: risolviPerBase(classico ? g.fvmClassico : g.fvmMantra, base) as number,
      spesaMassima: datiUtente.spesaMassima[g.id] ?? null,
      priorita: datiUtente.priorita[g.id] ?? null,
    };
  });
}

async function verificaGiocatore(giocatoreId: number): Promise<void> {
  if (!(await esisteGiocatore(giocatoreId))) {
    throw new Error(`Giocatore non trovato: ${giocatoreId}`);
  }
}

export async function aggiornaSpesaMassima(giocatoreId: number, valore: number | null): Promise<void> {
  if (valore != null && (valore < 0 || valore > 999)) {
    throw new Error("Spesa massima deve essere tra 0 e 999");
  }
  await verificaGiocatore(giocatoreId);
  await modificaDatiUtente((dati) => {
    if (valore == null) {
      delete dati.spesaMassima[giocatoreId];
    } else {
      dati.spesaMassima[giocatoreId] = valore;
    }
  });
}

export async function aggiornaPriorita(giocatoreId: number, valore: Priorita | null): Promise<void> {
  if (valore != null && !PRIORITA_VALIDE.includes(valore)) {
    throw new Error(`Priorita non valida: ${valore}`);
  }
  await verificaGiocatore(giocatoreId);
  await modificaDatiUtente((dati) => {
    if (valore == null) {
      delete dati.priorita[giocatoreId];
    } else {
      dati.priorita[giocatoreId] = valore;
    }
  });
}

export async function aggiornaAcquisto(giocatoreId: number, acquisto: Acquisto | null): Promise<void> {
  if (acquisto?.prezzo != null && (acquisto.prezzo < 0 || acquisto.prezzo > 9999)) {
    throw new Error("Prezzo non valido");
  }
  await verificaGiocatore(giocatoreId);
  await modificaDatiUtente((dati) => {
    if (acquisto == null) {
      delete dati.acquisti[giocatoreId];
    } else {
      dati.acquisti[giocatoreId] = acquisto;
    }
  });
}

export async function aggiornaConfigAsta(config: ConfigAsta): Promise<void> {
  await modificaDatiUtente((dati) => {
    dati.configAsta = config;
  });
}

/** Azzera solo gli acquisti: preferiti, spese massime, priorita e configurazione restano. */
export async function azzeraAcquisti(): Promise<void> {
  await modificaDatiUtente((dati) => {
    dati.acquisti = {};
  });
}

export async function fetchDatiAsta(): Promise<{ acquisti: Record<string, Acquisto>; configAsta: ConfigAsta }> {
  const { acquisti, configAsta } = await leggiDatiUtente();
  return { acquisti, configAsta };
}

/** Dati completi (Classico e Mantra, base 500 e 1000) per la scheda dettaglio e i conteggi dell'asta. */
export async function fetchGiocatoriCompleti(): Promise<Map<number, GiocatoreRaw>> {
  return new Map((await leggiGiocatori()).map((g) => [g.id, g]));
}
