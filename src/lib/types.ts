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
// admin_list_negocios_bloqueados (supabase/migrations/20260817221541_...,
// paginación agregada en 20260817223310_...) — ya vienen con el email del
// dueño resuelto server-side, ya que ni `personas` ni `persona_negocio`
// tienen policy admin-read directa. `total_count` es el total de negocios
// que matchean el filtro (antes de aplicar limit/offset), no el tamaño de
// la página actual — se repite en cada fila vía `count(*) over()`.
export interface NegocioReportadoPendiente {
  id_negocio: string;
  nombre: string;
  ciudad: string | null;
  departamento: string | null;
  owner_email: string | null;
  total_reportes: number;
  reportes_pendientes: number;
  ultimo_motivo: ReportReason | null;
  total_count: number;
}

export interface NegocioBloqueado {
  id_negocio: string;
  nombre: string;
  ciudad: string | null;
  departamento: string | null;
  owner_email: string | null;
  motivo_bloqueo: string | null;
  bloqueado_en: string | null;
  total_count: number;
}

// Filas de `necesidades_reportadas`/`problemas_reportados`, leídas directo
// (sin RPC) bajo las policies "necesidades_reportadas_select_admin" /
// "problemas_reportados_select_admin" (20260818030004_...) — no hay ningún
// join involucrado, a diferencia de los negocios reportados/bloqueados.
export interface NecesidadReportada {
  id: string;
  id_persona: string;
  descripcion_necesidad: string;
  fecha_creacion: string;
}

// CHECK problemas_reportados_estado_justificacion_consistency
// (20260818031409_...): 'pendiente' siempre trae justificacion=null;
// 'descartado'/'solucionado' siempre traen una justificacion no vacía.
export type ProblemaEstado = "pendiente" | "descartado" | "solucionado";

export interface ProblemaReportado {
  id: string;
  id_persona: string;
  descripcion_problema: string;
  fecha_creacion: string;
  estado: ProblemaEstado;
  justificacion: string | null;
}

export const PROBLEMA_ESTADO_LABELS: Record<ProblemaEstado, string> = {
  pendiente: "Pendiente",
  descartado: "Descartado",
  solucionado: "Solucionado",
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  informacion_incorrecta: "Información incorrecta",
  negocio_cerrado: "Negocio cerrado",
  contenido_inapropiado: "Contenido inapropiado",
  spam_falso: "Spam / falso",
  fraude: "Fraude",
  otro: "Otro",
};
