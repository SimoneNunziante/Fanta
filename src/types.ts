export type Modalita = "CLASSICO" | "MANTRA";
export type Base = "CINQUECENTO" | "MILLE";
export type CampoOrdinamento = "nome" | "squadra" | "quotazioneAsta" | "fantaValoreMedio";
export type Direzione = "asc" | "desc";
export type Priorita = "VERDE" | "GIALLO" | "ROSSO";

export type StatoAcquisto = "MIO" | "ALTRI";

export interface Acquisto {
  stato: StatoAcquisto;
  /** Prezzo pagato: obbligatorio per "MIO", facoltativo per "ALTRI". */
  prezzo: number | null;
}

/** Regole dell'asta, personalizzabili: gli slot usati dipendono dalla modalita' attiva. */
export interface ConfigAsta {
  budget: number;
  slotClassico: Record<"P" | "D" | "C" | "A", number>;
  /** Mantra: i portieri sono un reparto a se', gli altri ruoli condividono gli slot "Mov". */
  slotMantra: Record<"Por" | "Mov", number>;
}

export interface Giocatore {
  id: number;
  idEsterno: number;
  nome: string;
  squadra: string;
  ruolo: string[];
  quotazioneAsta: number;
  fantaValoreMedio: number;
  spesaMassima: number | null;
  priorita: Priorita | null;
}
