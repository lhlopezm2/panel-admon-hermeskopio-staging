import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import PaginationControls from "../components/PaginationControls";
import DateRangeFilter from "../components/DateRangeFilter";
import { dateRangeToIso } from "../lib/dateRange";
import {
  PROBLEMA_ESTADO_LABELS,
  type ProblemaEstado,
  type ProblemaReportado,
} from "../lib/types";

const PAGE_SIZE = 20;

const ESTADO_BADGE_CLASS: Record<Exclude<ProblemaEstado, "pendiente">, string> = {
  descartado: "bg-gray-100 text-gray-700",
  solucionado: "bg-green-100 text-green-700",
};

interface ActionTarget {
  id: string;
  estado: ProblemaEstado;
}

// Dos listas lado a lado: "Pendientes" y "Descartados / Solucionados"
// (mismo layout que NegociosReportadosPage, mismo motivo — evitar scroll
// excesivo). Cada una pagina de a PAGE_SIZE y filtra por su propio rango de
// fecha_creacion, de forma independiente. El estado es reversible en
// cualquier dirección (pendiente ↔ descartado ↔ solucionado) — sin
// historial de auditoría, solo el estado/justificación actuales — así que
// las 3 transiciones posibles comparten un único modal de confirmación:
// "pendiente" no pide justificación (y la borra), "descartado"/"solucionado"
// la exigen (CHECK problemas_reportados_estado_justificacion_consistency).
// UPDATE directo bajo "problemas_reportados_update_admin"
// (20260818031409_...), sin RPC — mismo patrón que "reports_update_admin".
export default function ProblemasReportadosPage() {
  const [pendientesPage, setPendientesPage] = useState(1);
  const [pendientesFrom, setPendientesFrom] = useState("");
  const [pendientesTo, setPendientesTo] = useState("");
  const [pendientes, setPendientes] = useState<ProblemaReportado[] | null>(null);
  const [pendientesTotal, setPendientesTotal] = useState(0);
  const [pendientesError, setPendientesError] = useState<string | null>(null);

  const [resueltosPage, setResueltosPage] = useState(1);
  const [resueltosFrom, setResueltosFrom] = useState("");
  const [resueltosTo, setResueltosTo] = useState("");
  const [resueltos, setResueltos] = useState<ProblemaReportado[] | null>(null);
  const [resueltosTotal, setResueltosTotal] = useState(0);
  const [resueltosError, setResueltosError] = useState<string | null>(null);

  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionJustificacion, setActionJustificacion] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadPendientes(pendientesPage, pendientesFrom, pendientesTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendientesPage, pendientesFrom, pendientesTo]);

  useEffect(() => {
    loadResueltos(resueltosPage, resueltosFrom, resueltosTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resueltosPage, resueltosFrom, resueltosTo]);

  function handlePendientesFromChange(value: string) {
    setPendientesFrom(value);
    setPendientesPage(1);
  }

  function handlePendientesToChange(value: string) {
    setPendientesTo(value);
    setPendientesPage(1);
  }

  function handleResueltosFromChange(value: string) {
    setResueltosFrom(value);
    setResueltosPage(1);
  }

  function handleResueltosToChange(value: string) {
    setResueltosTo(value);
    setResueltosPage(1);
  }

  async function loadPendientes(page: number, from: string, to: string) {
    const { fromIso, toIso } = dateRangeToIso(from, to);
    let query = supabase
      .from("problemas_reportados")
      .select("*", { count: "exact" })
      .eq("estado", "pendiente")
      .order("fecha_creacion", { ascending: false })
      .range((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE - 1);
    if (fromIso) query = query.gte("fecha_creacion", fromIso);
    if (toIso) query = query.lte("fecha_creacion", toIso);

    const { data, count, error } = await query;
    if (error) {
      setPendientesError(error.message);
      return;
    }
    setPendientesError(null);
    setPendientes((data as ProblemaReportado[]) ?? []);
    setPendientesTotal(count ?? 0);
  }

  async function loadResueltos(page: number, from: string, to: string) {
    const { fromIso, toIso } = dateRangeToIso(from, to);
    let query = supabase
      .from("problemas_reportados")
      .select("*", { count: "exact" })
      .in("estado", ["descartado", "solucionado"])
      .order("fecha_creacion", { ascending: false })
      .range((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE - 1);
    if (fromIso) query = query.gte("fecha_creacion", fromIso);
    if (toIso) query = query.lte("fecha_creacion", toIso);

    const { data, count, error } = await query;
    if (error) {
      setResueltosError(error.message);
      return;
    }
    setResueltosError(null);
    setResueltos((data as ProblemaReportado[]) ?? []);
    setResueltosTotal(count ?? 0);
  }

  function openAction(id: string, estado: ProblemaEstado, prefill = "") {
    setActionTarget({ id, estado });
    setActionJustificacion(prefill);
    setActionError(null);
  }

  function closeAction() {
    setActionTarget(null);
  }

  async function confirmAction() {
    if (!actionTarget) return;
    setActionBusy(true);
    setActionError(null);

    const { error } = await supabase
      .from("problemas_reportados")
      .update({
        estado: actionTarget.estado,
        justificacion:
          actionTarget.estado === "pendiente"
            ? null
            : actionJustificacion.trim(),
      })
      .eq("id", actionTarget.id);

    setActionBusy(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setActionTarget(null);
    loadPendientes(pendientesPage, pendientesFrom, pendientesTo);
    loadResueltos(resueltosPage, resueltosFrom, resueltosTo);
  }

  const justificacionRequired = actionTarget?.estado !== "pendiente";
  const confirmDisabled =
    actionBusy ||
    (justificacionRequired && actionJustificacion.trim().length === 0);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Pendientes
        </h2>
        <div className="mb-3">
          <DateRangeFilter
            from={pendientesFrom}
            to={pendientesTo}
            onFromChange={handlePendientesFromChange}
            onToChange={handlePendientesToChange}
          />
        </div>

        {pendientesError && (
          <p className="text-sm text-red-600">{pendientesError}</p>
        )}
        {pendientes === null && !pendientesError && (
          <p className="text-sm text-gray-500">Cargando…</p>
        )}
        {pendientes?.length === 0 && !pendientesError && (
          <p className="text-sm text-gray-500">
            No hay problemas pendientes en este rango.
          </p>
        )}

        <ul className="space-y-3">
          {pendientes?.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="mb-1 text-xs text-gray-400">
                {new Date(p.fecha_creacion).toLocaleString("es-CO")}
              </p>
              <p className="mb-3 text-sm text-gray-900">
                {p.descripcion_problema}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => openAction(p.id, "descartado")}
                  className="rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
                >
                  Descartar
                </button>
                <button
                  onClick={() => openAction(p.id, "solucionado")}
                  className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Marcar como solucionado
                </button>
              </div>
            </li>
          ))}
        </ul>

        {pendientes !== null && pendientes.length > 0 && (
          <PaginationControls
            page={pendientesPage}
            totalCount={pendientesTotal}
            pageSize={PAGE_SIZE}
            onPrev={() => setPendientesPage((p) => Math.max(1, p - 1))}
            onNext={() => setPendientesPage((p) => p + 1)}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Descartados / Solucionados
        </h2>
        <div className="mb-3">
          <DateRangeFilter
            from={resueltosFrom}
            to={resueltosTo}
            onFromChange={handleResueltosFromChange}
            onToChange={handleResueltosToChange}
          />
        </div>

        {resueltosError && (
          <p className="text-sm text-red-600">{resueltosError}</p>
        )}
        {resueltos === null && !resueltosError && (
          <p className="text-sm text-gray-500">Cargando…</p>
        )}
        {resueltos?.length === 0 && !resueltosError && (
          <p className="text-sm text-gray-500">
            No hay problemas descartados o solucionados en este rango.
          </p>
        )}

        <ul className="space-y-3">
          {resueltos?.map((p) => {
            const otherEstado: ProblemaEstado =
              p.estado === "descartado" ? "solucionado" : "descartado";
            return (
              <li
                key={p.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {new Date(p.fecha_creacion).toLocaleString("es-CO")}
                  </p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      ESTADO_BADGE_CLASS[
                        p.estado as Exclude<ProblemaEstado, "pendiente">
                      ]
                    }`}
                  >
                    {PROBLEMA_ESTADO_LABELS[p.estado]}
                  </span>
                </div>
                <p className="mb-2 text-sm text-gray-900">
                  {p.descripcion_problema}
                </p>
                {p.justificacion && (
                  <p className="mb-3 text-xs text-gray-500">
                    Justificación: {p.justificacion}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => openAction(p.id, "pendiente")}
                    className="rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Volver a pendiente
                  </button>
                  <button
                    onClick={() =>
                      openAction(p.id, otherEstado, p.justificacion ?? "")
                    }
                    className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    Marcar como {PROBLEMA_ESTADO_LABELS[otherEstado].toLowerCase()}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {resueltos !== null && resueltos.length > 0 && (
          <PaginationControls
            page={resueltosPage}
            totalCount={resueltosTotal}
            pageSize={PAGE_SIZE}
            onPrev={() => setResueltosPage((p) => Math.max(1, p - 1))}
            onNext={() => setResueltosPage((p) => p + 1)}
          />
        )}
      </section>

      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              {actionTarget.estado === "pendiente"
                ? "Volver a pendiente"
                : `Marcar como ${PROBLEMA_ESTADO_LABELS[actionTarget.estado].toLowerCase()}`}
            </h3>

            {actionTarget.estado === "pendiente" ? (
              <p className="text-sm text-gray-600">
                ¿Seguro que quieres volver este problema a pendiente? Se
                borrará la justificación actual.
              </p>
            ) : (
              <>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Justificación
                </label>
                <textarea
                  value={actionJustificacion}
                  onChange={(e) => setActionJustificacion(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  placeholder="Explica el motivo…"
                />
              </>
            )}

            {actionError && (
              <p className="mt-3 text-sm text-red-600">{actionError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeAction}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                disabled={confirmDisabled}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {actionBusy ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
