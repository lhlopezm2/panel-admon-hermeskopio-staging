import { describe, it, expect } from "vitest";
import { REPORT_REASON_LABELS, type ReportReason } from "../types";

const ALL_REASONS: ReportReason[] = [
  "informacion_incorrecta",
  "negocio_cerrado",
  "contenido_inapropiado",
  "spam_falso",
  "fraude",
  "otro",
];

describe("REPORT_REASON_LABELS", () => {
  it("tiene una etiqueta no vacía para cada motivo de ReportReason", () => {
    for (const reason of ALL_REASONS) {
      expect(REPORT_REASON_LABELS[reason]).toBeTruthy();
    }
  });

  it("no tiene claves huérfanas fuera de ReportReason", () => {
    expect(Object.keys(REPORT_REASON_LABELS).sort()).toEqual([...ALL_REASONS].sort());
  });
});
