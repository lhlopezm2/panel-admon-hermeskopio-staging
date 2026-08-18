interface PaginationControlsProps {
  page: number;
  totalCount: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}

// Compartido por todas las listas paginadas del panel (negocios reportados,
// bloqueados, necesidades, problemas) — mismo "← Anterior" / "Página X de
// Y" / "Siguiente →", cada una con su propio pageSize.
export default function PaginationControls({
  page,
  totalCount,
  pageSize,
  onPrev,
  onNext,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        ← Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        Siguiente →
      </button>
    </div>
  );
}
