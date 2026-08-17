import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

const { supabase } = vi.hoisted(() => ({
  supabase: {
    auth: { getSession: vi.fn() },
    rpc: vi.fn(),
  },
}));

vi.mock("../supabaseClient", () => ({ supabase }));

beforeEach(() => {
  vi.clearAllMocks();
  // AdminGuard se queda "checking" indefinidamente — estas pruebas solo
  // verifican el mapeo de rutas, no el resultado del check de admin.
  supabase.auth.getSession.mockReturnValue(new Promise(() => {}));
});

describe("App routing", () => {
  it("/login renderiza LoginPage sin pasar por AdminGuard", () => {
    window.history.pushState({}, "", "#/login");
    render(<App />);
    expect(
      screen.getByText("Panel de administración — Hermeskopio"),
    ).toBeInTheDocument();
    expect(supabase.auth.getSession).not.toHaveBeenCalled();
  });

  it("/reportes está protegida por AdminGuard", () => {
    window.history.pushState({}, "", "#/reportes");
    render(<App />);
    expect(screen.getByText("Verificando permisos…")).toBeInTheDocument();
  });

  it("/reportes/negocios está protegida por AdminGuard", () => {
    window.history.pushState({}, "", "#/reportes/negocios");
    render(<App />);
    expect(screen.getByText("Verificando permisos…")).toBeInTheDocument();
  });

  it("/reportes/necesidades está protegida por AdminGuard", () => {
    window.history.pushState({}, "", "#/reportes/necesidades");
    render(<App />);
    expect(screen.getByText("Verificando permisos…")).toBeInTheDocument();
  });

  it("/reportes/problemas está protegida por AdminGuard", () => {
    window.history.pushState({}, "", "#/reportes/problemas");
    render(<App />);
    expect(screen.getByText("Verificando permisos…")).toBeInTheDocument();
  });

  it("/negocio/:id está protegida por AdminGuard", () => {
    window.history.pushState({}, "", "#/negocio/b1");
    render(<App />);
    expect(screen.getByText("Verificando permisos…")).toBeInTheDocument();
  });

  it("una ruta desconocida redirige a /reportes", () => {
    window.history.pushState({}, "", "#/algo-que-no-existe");
    render(<App />);
    expect(screen.getByText("Verificando permisos…")).toBeInTheDocument();
  });
});
