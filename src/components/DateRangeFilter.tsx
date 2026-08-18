interface DateRangeFilterProps {
  from: string; // "" or "yyyy-mm-dd"
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

// Dos <input type="date"> lado a lado — reusado tanto por el filtro inline
// de una lista como por el modal de descarga de CSV, para que ambos
// controles se vean y comporten igual.
export default function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-sm text-gray-600">
        Desde
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-accent focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-1 text-sm text-gray-600">
        Hasta
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-accent focus:outline-none"
        />
      </label>
    </div>
  );
}
