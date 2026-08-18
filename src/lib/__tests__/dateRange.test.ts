import { describe, it, expect } from "vitest";
import { dateRangeToIso } from "../dateRange";

describe("dateRangeToIso", () => {
  it("convierte 'desde' al inicio del día en UTC", () => {
    expect(dateRangeToIso("2026-08-01", "").fromIso).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("convierte 'hasta' al final del día en UTC", () => {
    expect(dateRangeToIso("", "2026-08-17").toIso).toBe(
      "2026-08-17T23:59:59.999Z",
    );
  });

  it("devuelve null para el lado vacío del rango", () => {
    const { fromIso, toIso } = dateRangeToIso("", "");
    expect(fromIso).toBeNull();
    expect(toIso).toBeNull();
  });

  it("convierte ambos lados cuando los dos vienen presentes", () => {
    const { fromIso, toIso } = dateRangeToIso("2026-08-01", "2026-08-17");
    expect(fromIso).toBe("2026-08-01T00:00:00.000Z");
    expect(toIso).toBe("2026-08-17T23:59:59.999Z");
  });
});
