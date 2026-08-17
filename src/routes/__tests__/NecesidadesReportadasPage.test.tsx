import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NecesidadesReportadasPage from "../NecesidadesReportadasPage";

describe("NecesidadesReportadasPage", () => {
  it("muestra el placeholder 'Próximamente.'", () => {
    render(<NecesidadesReportadasPage />);
    expect(screen.getByText("Próximamente.")).toBeInTheDocument();
  });
});
