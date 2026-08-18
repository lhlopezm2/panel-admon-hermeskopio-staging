import { describe, it, expect } from "vitest";
import {
  PROBLEMA_ESTADO_LABELS,
  REPORT_REASON_LABELS,
  type ProblemaEstado,
  type ReportReason,
} from "../types";

const ALL_REASONS: ReportReason[] = [
  "informacion_incorrecta",
  "negocio_cerrado",
  "contenido_inapropiado",
  "spam_falso",
  "fraude",
  "otro",
];

const ALL_ESTADOS: ProblemaEstado[] = ["pendiente", "descartado", "solucionado"];

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

describe("PROBLEMA_ESTADO_LABELS", () => {
  it("tiene una etiqueta no vacía para cada ProblemaEstado", () => {
    for (const estado of ALL_ESTADOS) {
      expect(PROBLEMA_ESTADO_LABELS[estado]).toBeTruthy();
    }
  });

  it("no tiene claves huérfanas fuera de ProblemaEstado", () => {
    expect(Object.keys(PROBLEMA_ESTADO_LABELS).sort()).toEqual(
      [...ALL_ESTADOS].sort(),
    );
  });
});
