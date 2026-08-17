export interface Business {
  id: string;
  nombre: string;
  ciudad: string | null;
  departamento: string | null;
  bloqueado: boolean;
  motivo_bloqueo: string | null;
  bloqueado_en: string | null;
}

export type ReportReason =
  | "informacion_incorrecta"
  | "negocio_cerrado"
  | "contenido_inapropiado"
  | "spam_falso"
  | "fraude"
  | "otro";

export type ReportStatus = "pendiente" | "accionado" | "descartado";

export interface Report {
  id: string;
  id_negocio: string;
  id_persona: string;
  reason: ReportReason;
  comment: string | null;
  status: ReportStatus;
  fecha_creacion: string;
  businesses: Business | null;
}

export type BloqueoAccion = "bloqueo" | "desbloqueo";

export interface BloqueoHistorialRow {
  id: string;
  id_negocio: string;
  id_admin: string;
  accion: BloqueoAccion;
  motivo: string | null;
  fecha: string;
  email_enviado: boolean;
  email_enviado_en: string | null;
}

// Filas devueltas por los RPCs admin_list_negocios_reportados_pendientes /
// admin_list_negocios_bloqueados (supabase/migrations/20260817221541_...) —
// ya vienen con el email del dueño resuelto server-side, ya que ni
// `personas` ni `persona_negocio` tienen policy admin-read directa.
export interface NegocioReportadoPendiente {
  id_negocio: string;
  nombre: string;
  ciudad: string | null;
  departamento: string | null;
  owner_email: string | null;
  total_reportes: number;
  reportes_pendientes: number;
  ultimo_motivo: ReportReason | null;
}

export interface NegocioBloqueado {
  id_negocio: string;
  nombre: string;
  ciudad: string | null;
  departamento: string | null;
  owner_email: string | null;
  motivo_bloqueo: string | null;
  bloqueado_en: string | null;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  informacion_incorrecta: "Información incorrecta",
  negocio_cerrado: "Negocio cerrado",
  contenido_inapropiado: "Contenido inapropiado",
  spam_falso: "Spam / falso",
  fraude: "Fraude",
  otro: "Otro",
};
