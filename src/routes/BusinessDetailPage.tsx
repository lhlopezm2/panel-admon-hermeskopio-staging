import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  REPORT_REASON_LABELS,
  type BloqueoHistorialRow,
  type Business,
  type Report,
} from "../lib/types";

// Códigos custom que devuelve block_negocio/unblock_negocio — ver
// supabase/migrations/20260813044925_block_unblock_negocio_rpcs.sql.
const BL_ALREADY_BLOCKED = "BL001";
const BL_ALREADY_UNBLOCKED = "BL002";

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [historial, setHistorial] = useState<BloqueoHistorialRow[]>([]);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  async function load(negocioId: string) {
    // "businesses: admin read" deja ver el negocio aunque esté bloqueado —
    // "businesses: public read" (no-admin) no lo dejaría.
    const [{ data: b }, { data: r }, { data: h }] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", negocioId).single(),
      supabase
        .from("reports")
        .select("*")
        .eq("id_negocio", negocioId)
        .order("fecha_creacion", { ascending: false }),
      supabase
        .from("bloqueo_historial")
        .select("*")
        .eq("id_negocio", negocioId)
        .order("fecha", { ascending: false }),
    ]);
    setBusiness((b as Business) ?? null);
    setReports((r as Report[]) ?? []);
    setHistorial((h as BloqueoHistorialRow[]) ?? []);

    const latestBloqueo = ((h as BloqueoHistorialRow[]) ?? []).find(
      (row) => row.accion === "bloqueo",
    );
    if (latestBloqueo) {
      setEmailStatus(latestBloqueo.email_enviado ? "sent" : "failed");
    }
  }

  async function sendNotificationEmail(historialId: string) {
    if (!id) return;
    setEmailStatus("sending");
    const { data, error } = await supabase.functions.invoke(
      "send-bloqueo-email",
      { body: { negocio_id: id, historial_id: historialId } },
    );
    if (error || !data?.sent) {
      setEmailStatus("failed");
    } else {
      setEmailStatus("sent");
    }
  }

  async function handleBlock() {
    if (!id) return;
    setBusy(true);
    setMessage(null);

    const { data: historialId, error } = await supabase.rpc(
      "block_negocio",
      { p_negocio_id: id, p_motivo: motivo },
    );

    if (error) {
      if (error.code === BL_ALREADY_BLOCKED) {
        setMessage("Este negocio ya estaba bloqueado.");
        await load(id);
      } else {
        setMessage(error.message);
      }
      setBusy(false);
      return;
    }

    setMotivo("");
    await load(id);
    setBusy(false);
    if (historialId) {
      await sendNotificationEmail(historialId as string);
    }
  }

  async function handleUnblock() {
    if (!id) return;
    setBusy(true);
    setMessage(null);

    const { error } = await supabase.rpc("unblock_negocio", {
      p_negocio_id: id,
    });

    if (error) {
      setMessage(
        error.code === BL_ALREADY_UNBLOCKED
          ? "Este negocio ya estaba desbloqueado."
          : error.message,
      );
    }
    await load(id);
    setBusy(false);
  }

  async function handleRetryEmail() {
    const latestBloqueo = historial.find((row) => row.accion === "bloqueo");
    if (latestBloqueo) {
      await sendNotificationEmail(latestBloqueo.id);
    }
  }

  async function handleDismissReport(reportId: string) {
    await supabase
      .from("reports")
      .update({ status: "descartado" })
      .eq("id", reportId);
    if (id) await load(id);
  }

  if (!business) {
    return <div className="p-6 text-sm text-gray-500">Cargando…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link to="/reportes" className="text-sm text-gray-500 hover:underline">
        ← Volver a reportes
      </Link>

      <h1 className="mb-1 mt-3 text-xl font-semibold text-gray-900">
        {business.nombre}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {business.ciudad ?? "—"} · {business.departamento ?? "—"}
      </p>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {business.bloqueado ? (
          <>
            <p className="mb-1 text-sm font-medium text-red-700">
              Negocio bloqueado
            </p>
            <p className="mb-1 text-sm text-gray-700">
              Motivo: {business.motivo_bloqueo}
            </p>
            <p className="mb-4 text-xs text-gray-400">
              {business.bloqueado_en &&
                new Date(business.bloqueado_en).toLocaleString("es-CO")}
            </p>

            <div className="mb-4 text-sm">
              {emailStatus === "sending" && (
                <span className="text-gray-500">Enviando correo…</span>
              )}
              {emailStatus === "sent" && (
                <span className="text-green-700">
                  Correo de notificación enviado.
                </span>
              )}
              {emailStatus === "failed" && (
                <div className="flex items-center gap-2">
                  <span className="text-red-600">Correo no enviado.</span>
                  <button
                    onClick={handleRetryEmail}
                    className="rounded bg-gray-200 px-2 py-1 text-xs font-medium hover:bg-gray-300"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleUnblock}
              disabled={busy}
              className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Desbloquear
            </button>
          </>
        ) : (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Motivo del bloqueo
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              placeholder="Describe por qué se bloquea este negocio…"
            />
            <button
              onClick={handleBlock}
              disabled={busy || motivo.trim().length === 0}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Bloquear negocio
            </button>
          </>
        )}
        {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
      </section>

      <h2 className="mb-2 text-sm font-semibold text-gray-900">
        Reportes ({reports.length})
      </h2>
      <ul className="mb-6 space-y-2">
        {reports.map((r) => (
          <li
            key={r.id}
            className="rounded border border-gray-200 bg-white p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {REPORT_REASON_LABELS[r.reason]}
              </span>
              <span
                className={
                  r.status === "pendiente"
                    ? "text-xs text-amber-600"
                    : "text-xs text-gray-400"
                }
              >
                {r.status}
              </span>
            </div>
            {r.comment && (
              <p className="mt-1 text-gray-600">{r.comment}</p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {new Date(r.fecha_creacion).toLocaleString("es-CO")}
              </span>
              {r.status === "pendiente" && (
                <button
                  onClick={() => handleDismissReport(r.id)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Descartar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {historial.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">
            Historial de moderación
          </h2>
          <ul className="space-y-1 text-xs text-gray-500">
            {historial.map((h) => (
              <li key={h.id}>
                {new Date(h.fecha).toLocaleString("es-CO")} — {h.accion}
                {h.motivo ? `: ${h.motivo}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
