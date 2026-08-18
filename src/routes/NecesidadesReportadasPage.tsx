import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import PaginationControls from "../components/PaginationControls";
import DateRangeFilter from "../components/DateRangeFilter";
import { dateRangeToIso } from "../lib/dateRange";
import { toCsv, downloadCsv } from "../lib/csv";
import type { NecesidadReportada } from "../lib/types";

const PAGE_SIZE = 20;

// Lista paginada (20/página) de `necesidades_reportadas`, filtrable por
// rango de fecha_creacion, con un botón de descarga CSV (columna única
// "Descripcion") — su propio rango, prellenado con el filtro de la lista
// al abrirse, requerido (ambas fechas) antes de habilitar "Descargar".
// Lectura directa (sin RPC) bajo "necesidades_reportadas_select_admin"
// (20260818030004_...) — no hay ningún join involucrado.
export default function NecesidadesReportadasPage() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NecesidadReportada[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFrom, setDownloadFrom] = useState("");
  const [downloadTo, setDownloadTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    load(page, filterFrom, filterTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterFrom, filterTo]);

  function handleFilterFromChange(value: string) {
    setFilterFrom(value);
    setPage(1);
  }

  function handleFilterToChange(value: string) {
    setFilterTo(value);
    setPage(1);
  }

  async function load(p: number, from: string, to: string) {
    const { fromIso, toIso } = dateRangeToIso(from, to);
    let query = supabase
      .from("necesidades_reportadas")
      .select("*", { count: "exact" })
      .order("fecha_creacion", { ascending: false })
      .range((p - 1) * PAGE_SIZE, (p - 1) * PAGE_SIZE + PAGE_SIZE - 1);
    if (fromIso) query = query.gte("fecha_creacion", fromIso);
    if (toIso) query = query.lte("fecha_creacion", toIso);

    const { data, count, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setError(null);
    setItems((data as NecesidadReportada[]) ?? []);
    setTotal(count ?? 0);
  }

  function openDownloadModal() {
    setDownloadFrom(filterFrom);
    setDownloadTo(filterTo);
    setDownloadError(null);
    setShowDownloadModal(true);
  }

  async function handleDownload() {
    if (!downloadFrom || !downloadTo) return;
    setDownloading(true);
    setDownloadError(null);

    const { fromIso, toIso } = dateRangeToIso(downloadFrom, downloadTo);
    const { data, error: fetchError } = await supabase
      .from("necesidades_reportadas")
      .select("descripcion_necesidad")
      .gte("fecha_creacion", fromIso as string)
      .lte("fecha_creacion", toIso as string)
      .order("fecha_creacion", { ascending: false });

    setDownloading(false);
    if (fetchError) {
      setDownloadError(fetchError.message);
      return;
    }

    const rows = (data ?? []).map(
      (r: { descripcion_necesidad: string }) => r.descripcion_necesidad,
    );
    const csv = toCsv("Descripcion", rows);
    downloadCsv(`necesidades_${downloadFrom}_a_${downloadTo}.csv`, csv);
    setShowDownloadModal(false);
  }

  const downloadReady = downloadFrom.length > 0 && downloadTo.length > 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter
          from={filterFrom}
          to={filterTo}
          onFromChange={handleFilterFromChange}
          onToChange={handleFilterToChange}
        />
        <button
          onClick={openDownloadModal}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Descargar CSV
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {items === null && !error && (
        <p className="text-sm text-gray-500">Cargando…</p>
      )}
      {items?.length === 0 && !error && (
        <p className="text-sm text-gray-500">
          No hay necesidades reportadas en este rango.
        </p>
      )}

      <ul className="space-y-3">
        {items?.map((n) => (
          <li
            key={n.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="mb-1 text-xs text-gray-400">
              {new Date(n.fecha_creacion).toLocaleString("es-CO")}
            </p>
            <p className="text-sm text-gray-900">{n.descripcion_necesidad}</p>
          </li>
        ))}
      </ul>

      {items !== null && items.length > 0 && (
        <PaginationControls
          page={page}
          totalCount={total}
          pageSize={PAGE_SIZE}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              Descargar necesidades reportadas
            </h3>
            <p className="mb-3 text-sm text-gray-500">
              Elige el rango de fechas a exportar.
            </p>
            <DateRangeFilter
              from={downloadFrom}
              to={downloadTo}
              onFromChange={setDownloadFrom}
              onToChange={setDownloadTo}
            />
            {downloadError && (
              <p className="mt-3 text-sm text-red-600">{downloadError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleDownload}
                disabled={!downloadReady || downloading}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {downloading ? "Descargando…" : "Descargar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
