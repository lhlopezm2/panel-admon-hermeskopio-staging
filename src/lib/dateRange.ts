// Convierte un rango de fechas de <input type="date"> ("yyyy-mm-dd", sin
// hora/zona) a los límites ISO usados para filtrar una columna timestamptz
// como fecha_creacion. Se interpreta el día elegido en UTC (simplificación
// deliberada — el panel no maneja zona horaria en ningún otro lado) y
// "hasta" incluye el día completo (23:59:59.999).
export function dateRangeToIso(
  from: string,
  to: string,
): { fromIso: string | null; toIso: string | null } {
  return {
    fromIso: from ? `${from}T00:00:00.000Z` : null,
    toIso: to ? `${to}T23:59:59.999Z` : null,
  };
}
