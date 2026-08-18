// Escapa un campo para CSV (RFC 4180): entre comillas si contiene coma,
// comilla o salto de línea, duplicando las comillas internas.
function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(header: string, rows: string[]): string {
  return [header, ...rows.map(escapeCsvField)].join("\r\n");
}

// El BOM (﻿) es necesario para que Excel detecte UTF-8 correctamente
// y no rompa acentos/ñ al abrir el archivo directamente.
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["﻿" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
