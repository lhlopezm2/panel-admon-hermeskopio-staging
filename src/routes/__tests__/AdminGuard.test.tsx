import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminGuard from "../AdminGuard";

const { supabase } = vi.hoisted(() => ({
  supabase: {
    auth: { getSession: vi.fn() },
    rpc: vi.fn(),
  },
}));

vi.mock("../../supabaseClient", () => ({ supabase }));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/protegido"]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<AdminGuard />}>
          <Route path="/protegido" element={<div>Contenido protegido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminGuard", () => {
  it("muestra 'Verificando permisos…' mientras resuelve", () => {
    supabase.auth.getSession.mockReturnValue(new Promise(() => {}));
    renderGuard();
    expect(screen.getByText("Verificando permisos…")).toBeInTheDocument();
  });

  it("redirige a /login sin sesión, sin llamar a is_admin", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    renderGuard();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("permite el acceso con sesión y is_admin() = true", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    supabase.rpc.mockResolvedValue({ data: true, error: null });
    renderGuard();
    expect(await screen.findByText("Contenido protegido")).toBeInTheDocument();
  });

  it("redirige a /login con sesión pero is_admin() = false", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    supabase.rpc.mockResolvedValue({ data: false, error: null });
    renderGuard();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("redirige a /login si la rpc is_admin() devuelve error", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    supabase.rpc.mockResolvedValue({ data: true, error: { message: "boom" } });
    renderGuard();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("no falla si el componente se desmonta antes de que la verificación resuelva", async () => {
    let resolveSession!: (value: { data: { session: null } }) => void;
    supabase.auth.getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const { unmount } = renderGuard();
    unmount();
    resolveSession({ data: { session: null } });
    await new Promise((r) => setTimeout(r, 0));
  });
});
