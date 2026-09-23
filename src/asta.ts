import type { GiocatoreRaw } from "./store";
import type { Acquisto, ConfigAsta, Modalita } from "./types";

export interface SlotReparto {
  reparto: string;
  presi: number;
  totale: number;
}

export interface RiepilogoAsta {
  budget: number;
  spesi: number;
  residuo: number;
  reparti: SlotReparto[];
  slotMancanti: number;
  /** Quanto puoi offrire ora per un giocatore, tenendo 1 credito per ogni altro slot da riempire. */
  maxSpendibile: number;
}

/** Reparto che il giocatore occupa nella rosa: in Mantra conta solo portiere / movimento. */
export function repartoDi(g: GiocatoreRaw, modalita: Modalita): string {
  if (modalita === "CLASSICO") return g.ruoloClassico;
  return g.ruoliMantra.includes("Por") ? "Por" : "Mov";
}

export function slotConfigurati(config: ConfigAsta, modalita: Modalita): Record<string, number> {
  return modalita === "CLASSICO" ? config.slotClassico : config.slotMantra;
}

export function calcolaRiepilogo(
  config: ConfigAsta,
  acquisti: Record<string, Acquisto>,
  giocatori: Map<number, GiocatoreRaw>,
  modalita: Modalita,
): RiepilogoAsta {
  const slot = slotConfigurati(config, modalita);
  const presiPerReparto: Record<string, number> = Object.fromEntries(Object.keys(slot).map((r) => [r, 0]));
  let spesi = 0;
  for (const [id, acquisto] of Object.entries(acquisti)) {
    if (acquisto.stato !== "MIO") continue;
    spesi += acquisto.prezzo ?? 0;
    const g = giocatori.get(Number(id));
    if (g) {
      const reparto = repartoDi(g, modalita);
      presiPerReparto[reparto] = (presiPerReparto[reparto] ?? 0) + 1;
    }
  }
  const reparti = Object.entries(slot).map(([reparto, totale]) => ({
    reparto,
    presi: presiPerReparto[reparto] ?? 0,
    totale,
  }));
  const slotMancanti = reparti.reduce((acc, r) => acc + Math.max(0, r.totale - r.presi), 0);
  const residuo = config.budget - spesi;
  const maxSpendibile = slotMancanti > 0 ? Math.max(0, residuo - (slotMancanti - 1)) : 0;
  return { budget: config.budget, spesi, residuo, reparti, slotMancanti, maxSpendibile };
}

/** Il reparto del giocatore e' gia' completo nella tua rosa? */
export function repartoPieno(riepilogo: RiepilogoAsta, g: GiocatoreRaw, modalita: Modalita): boolean {
  const r = riepilogo.reparti.find((x) => x.reparto === repartoDi(g, modalita));
  return r ? r.presi >= r.totale : false;
}
