export type Modalita = "CLASSICO" | "MANTRA";
export type Base = "CINQUECENTO" | "MILLE";
export type CampoOrdinamento = "nome" | "squadra" | "quotazioneAsta" | "fantaValoreMedio";
export type Direzione = "asc" | "desc";
export type Priorita = "VERDE" | "GIALLO" | "ROSSO";

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
