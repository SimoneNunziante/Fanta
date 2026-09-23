import { useEffect, useState } from "react";

interface Props {
  valore: number | null;
  onSalva: (valore: number | null) => void;
}

export function SpesaMassimaInput({ valore, onSalva }: Props) {
  const [testo, setTesto] = useState(valore === null ? "" : String(valore));

  useEffect(() => {
    setTesto(valore === null ? "" : String(valore));
  }, [valore]);

  function commit() {
    const pulito = testo.trim();
    const nuovoValore = pulito === "" ? null : Number(pulito);
    if (nuovoValore !== valore) {
      onSalva(nuovoValore);
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className="spesa-massima-input"
      maxLength={3}
      placeholder="—"
      value={testo}
      onChange={(e) => setTesto(e.currentTarget.value.replace(/[^0-9]/g, "").slice(0, 3))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
