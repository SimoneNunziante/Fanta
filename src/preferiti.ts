import { esisteGiocatore, leggiDatiUtente, modificaDatiUtente } from "./store";

export async function fetchPreferiti(): Promise<Set<number>> {
  return new Set((await leggiDatiUtente()).preferiti);
}

export async function aggiungiPreferito(giocatoreId: number): Promise<void> {
  if (!(await esisteGiocatore(giocatoreId))) {
    throw new Error(`Giocatore non trovato: ${giocatoreId}`);
  }
  await modificaDatiUtente((dati) => {
    if (!dati.preferiti.includes(giocatoreId)) {
      dati.preferiti.push(giocatoreId);
    }
  });
}

export async function rimuoviPreferito(giocatoreId: number): Promise<void> {
  await modificaDatiUtente((dati) => {
    dati.preferiti = dati.preferiti.filter((id) => id !== giocatoreId);
  });
}
