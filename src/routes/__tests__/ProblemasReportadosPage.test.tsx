import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProblemasReportadosPage from "../ProblemasReportadosPage";

describe("ProblemasReportadosPage", () => {
  it("muestra el placeholder 'Próximamente.'", () => {
    render(<ProblemasReportadosPage />);
    expect(screen.getByText("Próximamente.")).toBeInTheDocument();
  });
});
