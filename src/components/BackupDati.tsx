import { useRef, useState } from "react";
import { leggiDatiUtente, normalizzaDatiUtente, salvaDatiUtente } from "../store";

/** I dati utente vivono solo nel browser: permette di salvarli su file e ripristinarli. */
export function BackupDati() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function esporta() {
    const dati = await leggiDatiUtente();
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fantamantra-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importa(file: File) {
    try {
      salvaDatiUtente(normalizzaDatiUtente(JSON.parse(await file.text())));
      window.location.reload();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Importazione non riuscita");
    }
  }

  return (
    <div className="backup-row">
      <button type="button" className="toggle" onClick={esporta}>
        Esporta backup
      </button>
      <button type="button" className="toggle" onClick={() => inputRef.current?.click()}>
        Importa backup
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) importa(file);
          e.currentTarget.value = "";
        }}
      />
      {errore && <p className="errore">{errore}</p>}
    </div>
  );
}
