import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReportsLayout from "../ReportsLayout";

const { supabase } = vi.hoisted(() => ({
  supabase: {
    auth: { signOut: vi.fn() },
  },
}));

vi.mock("../../supabaseClient", () => ({ supabase }));

function renderLayout(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ReportsLayout />}>
          <Route path="/reportes/negocios" element={<p>contenido negocios</p>} />
          <Route path="/reportes/necesidades" element={<p>contenido necesidades</p>} />
          <Route path="/reportes/problemas" element={<p>contenido problemas</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportsLayout", () => {
  it("renderiza las 3 pestañas", () => {
    renderLayout("/reportes/negocios");
    expect(screen.getByText("Negocios Reportados")).toBeInTheDocument();
    expect(screen.getByText("Necesidades Reportadas")).toBeInTheDocument();
    expect(screen.getByText("Problemas Reportados")).toBeInTheDocument();
  });

  it("renderiza el contenido de la ruta anidada activa (Outlet)", () => {
    renderLayout("/reportes/necesidades");
    expect(screen.getByText("contenido necesidades")).toBeInTheDocument();
    expect(screen.queryByText("contenido negocios")).not.toBeInTheDocument();
  });

  it("cierra sesión al hacer click en 'Cerrar sesión'", () => {
    supabase.auth.signOut.mockResolvedValue({ error: null });
    renderLayout("/reportes/negocios");
    fireEvent.click(screen.getByText("Cerrar sesión"));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
