import { coloreRuolo } from "../ruoloColori";
import { SpesaMassimaInput } from "./SpesaMassimaInput";
import { PrioritaSemaforo } from "./PrioritaSemaforo";
import type { CampoOrdinamento, Direzione, Giocatore, Priorita } from "../types";

interface Props {
  giocatori: Giocatore[];
  sortCampo: CampoOrdinamento;
  direzione: Direzione;
  onSortChange: (campo: CampoOrdinamento) => void;
  soloPreferiti: boolean;
  preferiti: Set<number>;
  onAggiungiPreferito: (giocatoreId: number) => void;
  onRimuoviPreferito: (giocatoreId: number) => void;
  onSalvaSpesaMassima: (giocatoreId: number, valore: number | null) => void;
  onSalvaPriorita: (giocatoreId: number, valore: Priorita | null) => void;
}

export function GiocatoriTable({
  giocatori,
  sortCampo,
  direzione,
  onSortChange,
  soloPreferiti,
  preferiti,
  onAggiungiPreferito,
  onRimuoviPreferito,
  onSalvaSpesaMassima,
  onSalvaPriorita,
}: Props) {
  function renderHeader(campo: CampoOrdinamento, label: string, labelCorta = label, className = "") {
    const attivo = campo === sortCampo;
    return (
      <th
        className={`sortable ${className}`.trim()}
        aria-sort={attivo ? (direzione === "asc" ? "ascending" : "descending") : "none"}
        onClick={() => onSortChange(campo)}
      >
        <span className="label-lunga">{label}</span>
        <span className="label-corta">{labelCorta}</span>
        {attivo && (direzione === "asc" ? " ▲" : " ▼")}
      </th>
    );
  }

  return (
    <div className="tabella-wrapper">
    <table className="giocatori-table">
      <thead>
        <tr>
          {renderHeader("nome", "Nome", "Nome", "col-nome")}
          {renderHeader("squadra", "Squadra", "Squadra", "col-squadra")}
          <th>Ruolo</th>
          {renderHeader("quotazioneAsta", "Quotazione Asta", "Quot.")}
          {renderHeader("fantaValoreMedio", "Fantavalore Medio", "FVM")}
          {soloPreferiti && (
            <th>
              <span className="label-lunga">Spesa massima</span>
              <span className="label-corta">Max</span>
            </th>
          )}
          {soloPreferiti && (
            <th>
              <span className="label-lunga">Priorità</span>
              <span className="label-corta">Prio</span>
            </th>
          )}
          <th aria-label="Preferito" />
        </tr>
      </thead>
      <tbody>
        {giocatori.map((g) => {
          const preferito = preferiti.has(g.id);
          return (
          <tr key={g.id}>
            <td className="col-nome">
              <span className="nome-giocatore">{g.nome}</span>
              <span className="squadra-mobile">{g.squadra}</span>
            </td>
            <td className="col-squadra">{g.squadra}</td>
            <td>
              <div className="ruolo-badges">
                {g.ruolo.map((r) => (
                  <span key={r} className="ruolo-badge" data-colore={coloreRuolo(r)}>
                    {r}
                  </span>
                ))}
              </div>
            </td>
            <td>{g.quotazioneAsta}</td>
            <td>{g.fantaValoreMedio}</td>
            {soloPreferiti && (
              <td>
                <SpesaMassimaInput
                  valore={g.spesaMassima}
                  onSalva={(valore) => onSalvaSpesaMassima(g.id, valore)}
                />
              </td>
            )}
            {soloPreferiti && (
              <td>
                <PrioritaSemaforo
                  valore={g.priorita}
                  onCambia={(valore) => onSalvaPriorita(g.id, valore)}
                />
              </td>
            )}
            <td>
              <button
                type="button"
                className={preferito ? "azione-preferito-btn rimuovi" : "azione-preferito-btn aggiungi"}
                aria-label={preferito ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                onClick={() => (preferito ? onRimuoviPreferito(g.id) : onAggiungiPreferito(g.id))}
              >
                {preferito ? "✕" : "+"}
              </button>
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
