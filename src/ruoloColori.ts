/** Ordine dei ruoli (dalla porta all'attacco): usato dal selettore e dall'ordinamento per ruolo. */
export const RUOLI_CLASSICO = ["P", "D", "C", "A"];
export const RUOLI_MANTRA = ["Por", "Dc", "Dd", "Ds", "B", "E", "M", "C", "W", "T", "A", "Pc"];

export type ColoreRuolo = "giallo" | "viola" | "rosso" | "blu" | "verde";

// Mappatura stile fantacalcio.it/quotazioni-fantacalcio: portiere giallo,
// trequartisti/ali viola, attaccanti rosso, centrocampisti blu, difensori verde.
const MAPPA_COLORI: Record<string, ColoreRuolo> = {
  P: "giallo",
  Por: "giallo",
  T: "viola",
  W: "viola",
  A: "rosso",
  Pc: "rosso",
  M: "blu",
  C: "blu",
  E: "blu",
  D: "verde",
  Dc: "verde",
  Dd: "verde",
  Ds: "verde",
  B: "verde",
};

export function coloreRuolo(codice: string): ColoreRuolo {
  return MAPPA_COLORI[codice] ?? "blu";
}
