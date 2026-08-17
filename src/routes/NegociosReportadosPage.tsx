import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import {
  REPORT_REASON_LABELS,
  type NegocioBloqueado,
  type NegocioReportadoPendiente,
} from "../lib/types";

// Dos listados independientes, cada uno con su propio buscador por email
// del dueño — respaldados por los RPCs admin_list_negocios_reportados_pendientes
// / admin_list_negocios_bloqueados (supabase/migrations/20260817221541_...),
// que resuelven el join hasta personas.email server-side porque el panel no
// tiene visibilidad RLS directa sobre esa tabla.
export default function NegociosReportadosPage() {
  const [pendientesSearch, setPendientesSearch] = useState("");
  const [pendientes, setPendientes] = useState<NegocioReportadoPendiente[] | null>(null);
  const [pendientesError, setPendientesError] = useState<string | null>(null);
  const debouncedPendientesSearch = useDebouncedValue(pendientesSearch, 300);

  const [bloqueadosSearch, setBloqueadosSearch] = useState("");
  const [bloqueados, setBloqueados] = useState<NegocioBloqueado[] | null>(null);
  const [bloqueadosError, setBloqueadosError] = useState<string | null>(null);
  const debouncedBloqueadosSearch = useDebouncedValue(bloqueadosSearch, 300);

  useEffect(() => {
    loadPendientes(debouncedPendientesSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPendientesSearch]);

  useEffect(() => {
    loadBloqueados(debouncedBloqueadosSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBloqueadosSearch]);

  async function loadPendientes(search: string) {
    const { data, error } = await supabase.rpc(
      "admin_list_negocios_reportados_pendientes",
      { p_email_search: search.trim() || null },
    );
    if (error) {
      setPendientesError(error.message);
      return;
    }
    setPendientesError(null);
    setPendientes((data as NegocioReportadoPendiente[]) ?? []);
  }

  async function loadBloqueados(search: string) {
    const { data, error } = await supabase.rpc("admin_list_negocios_bloqueados", {
      p_email_search: search.trim() || null,
    });
    if (error) {
      setBloqueadosError(error.message);
      return;
    }
    setBloqueadosError(null);
    setBloqueados((data as NegocioBloqueado[]) ?? []);
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Con reportes pendientes
        </h2>
        <input
          type="search"
          value={pendientesSearch}
          onChange={(e) => setPendientesSearch(e.target.value)}
          placeholder="Buscar por correo del dueño…"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />

        {pendientesError && (
          <p className="text-sm text-red-600">{pendientesError}</p>
        )}
        {pendientes === null && !pendientesError && (
          <p className="text-sm text-gray-500">Cargando…</p>
        )}
        {pendientes?.length === 0 && !pendientesError && (
          <p className="text-sm text-gray-500">
            {pendientesSearch.trim()
              ? "No se encontraron negocios con ese correo."
              : "No hay negocios con reportes pendientes."}
          </p>
        )}

        <ul className="space-y-3">
          {pendientes?.map((n) => (
            <li key={n.id_negocio}>
              <Link
                to={`/negocio/${n.id_negocio}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-accent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{n.nombre}</p>
                    <p className="text-sm text-gray-500">
                      {n.ciudad ?? "Ciudad no especificada"}
                    </p>
                    {n.owner_email && (
                      <p className="text-xs text-gray-400">{n.owner_email}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-600">
                    {n.total_reportes} reporte
                    {n.total_reportes !== 1 ? "s" : ""} ({n.reportes_pendientes} pendiente
                    {n.reportes_pendientes !== 1 ? "s" : ""})
                  </span>
                </div>
                {n.ultimo_motivo && (
                  <p className="mt-2 text-xs text-gray-400">
                    Último motivo: {REPORT_REASON_LABELS[n.ultimo_motivo]}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Bloqueados
        </h2>
        <input
          type="search"
          value={bloqueadosSearch}
          onChange={(e) => setBloqueadosSearch(e.target.value)}
          placeholder="Buscar por correo del dueño…"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />

        {bloqueadosError && (
          <p className="text-sm text-red-600">{bloqueadosError}</p>
        )}
        {bloqueados === null && !bloqueadosError && (
          <p className="text-sm text-gray-500">Cargando…</p>
        )}
        {bloqueados?.length === 0 && !bloqueadosError && (
          <p className="text-sm text-gray-500">
            {bloqueadosSearch.trim()
              ? "No se encontraron negocios con ese correo."
              : "No hay negocios bloqueados."}
          </p>
        )}

        <ul className="space-y-3">
          {bloqueados?.map((n) => (
            <li key={n.id_negocio}>
              <Link
                to={`/negocio/${n.id_negocio}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-accent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{n.nombre}</p>
                    <p className="text-sm text-gray-500">
                      {n.ciudad ?? "Ciudad no especificada"}
                    </p>
                    {n.owner_email && (
                      <p className="text-xs text-gray-400">{n.owner_email}</p>
                    )}
                  </div>
                  <span className="mb-1 block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Bloqueado
                  </span>
                </div>
                {n.motivo_bloqueo && (
                  <p className="mt-2 text-xs text-gray-400">
                    Motivo: {n.motivo_bloqueo}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
