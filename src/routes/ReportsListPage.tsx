import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { REPORT_REASON_LABELS, type Report } from "../lib/types";

interface BusinessGroup {
  id_negocio: string;
  nombre: string;
  ciudad: string | null;
  bloqueado: boolean;
  reports: Report[];
}

export default function ReportsListPage() {
  const [groups, setGroups] = useState<BusinessGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError(null);
    // Solo posible bajo la policy "reports_select_admin" — un no-admin no
    // podría ver reportes de negocios ajenos.
    const { data, error: fetchError } = await supabase
      .from("reports")
      .select(
        "id, id_negocio, id_persona, reason, comment, status, fecha_creacion, businesses(id, nombre, ciudad, departamento, bloqueado, motivo_bloqueo, bloqueado_en)",
      )
      .order("fecha_creacion", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    const byBusiness = new Map<string, BusinessGroup>();
    for (const row of (data ?? []) as unknown as Report[]) {
      const business = row.businesses;
      if (!business) continue;
      const existing = byBusiness.get(row.id_negocio);
      if (existing) {
        existing.reports.push(row);
      } else {
        byBusiness.set(row.id_negocio, {
          id_negocio: row.id_negocio,
          nombre: business.nombre,
          ciudad: business.ciudad,
          bloqueado: business.bloqueado,
          reports: [row],
        });
      }
    }
    setGroups(Array.from(byBusiness.values()));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Negocios reportados
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:underline"
        >
          Cerrar sesión
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {groups === null && !error && (
        <p className="text-sm text-gray-500">Cargando…</p>
      )}
      {groups?.length === 0 && (
        <p className="text-sm text-gray-500">No hay reportes pendientes.</p>
      )}

      <ul className="space-y-3">
        {groups?.map((g) => {
          const pendientes = g.reports.filter(
            (r) => r.status === "pendiente",
          ).length;
          return (
            <li key={g.id_negocio}>
              <Link
                to={`/negocio/${g.id_negocio}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-accent"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{g.nombre}</p>
                    <p className="text-sm text-gray-500">
                      {g.ciudad ?? "Ciudad no especificada"}
                    </p>
                  </div>
                  <div className="text-right">
                    {g.bloqueado && (
                      <span className="mb-1 block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Bloqueado
                      </span>
                    )}
                    <span className="text-sm text-gray-600">
                      {g.reports.length} reporte
                      {g.reports.length !== 1 ? "s" : ""}
                      {pendientes > 0 ? ` (${pendientes} pendiente${pendientes !== 1 ? "s" : ""})` : ""}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Último motivo:{" "}
                  {REPORT_REASON_LABELS[g.reports[0].reason]}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
