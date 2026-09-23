interface Props {
  squadre: string[];
  squadra: string | null;
  onSquadraChange: (s: string | null) => void;
}

export function SquadraSelector({ squadre, squadra, onSquadraChange }: Props) {
  return (
    <select
      className="squadra-select"
      value={squadra ?? ""}
      onChange={(e) => onSquadraChange(e.currentTarget.value || null)}
      aria-label="Squadra"
    >
      <option value="">Tutte le squadre</option>
      {squadre.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
