import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NegociosReportadosPage from "../NegociosReportadosPage";
import type { NegocioBloqueado, NegocioReportadoPendiente } from "../../lib/types";

const { supabase } = vi.hoisted(() => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("../../supabaseClient", () => ({ supabase }));

const pendienteRow: NegocioReportadoPendiente = {
  id_negocio: "b1",
  nombre: "Negocio Pendiente",
  ciudad: "Cali",
  departamento: "Valle",
  owner_email: "dueno1@example.com",
  total_reportes: 3,
  reportes_pendientes: 2,
  ultimo_motivo: "fraude",
};

const bloqueadoRow: NegocioBloqueado = {
  id_negocio: "b2",
  nombre: "Negocio Bloqueado",
  ciudad: "Bogotá",
  departamento: "Cundinamarca",
  owner_email: "dueno2@example.com",
  motivo_bloqueo: "Contenido spam",
  bloqueado_en: "2026-08-17T00:00:00Z",
};

function mockRpc(pendientes: NegocioReportadoPendiente[], bloqueados: NegocioBloqueado[]) {
  supabase.rpc.mockImplementation((fn: string) => {
    if (fn === "admin_list_negocios_reportados_pendientes") {
      return Promise.resolve({ data: pendientes, error: null });
    }
    if (fn === "admin_list_negocios_bloqueados") {
      return Promise.resolve({ data: bloqueados, error: null });
    }
    throw new Error(`rpc inesperado: ${fn}`);
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NegociosReportadosPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NegociosReportadosPage", () => {
  it("muestra 'Cargando…' en ambas secciones antes de resolver", () => {
    supabase.rpc.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByText("Cargando…")).toHaveLength(2);
  });

  it("muestra el estado vacío por defecto en ambas secciones", async () => {
    mockRpc([], []);
    renderPage();
    expect(
      await screen.findByText("No hay negocios con reportes pendientes."),
    ).toBeInTheDocument();
    expect(await screen.findByText("No hay negocios bloqueados.")).toBeInTheDocument();
  });

  it("lista un negocio con reportes pendientes: nombre, email del dueño, conteo y último motivo", async () => {
    mockRpc([pendienteRow], []);
    renderPage();

    expect(await screen.findByText("Negocio Pendiente")).toBeInTheDocument();
    expect(screen.getByText("dueno1@example.com")).toBeInTheDocument();
    expect(screen.getByText("3 reportes (2 pendientes)")).toBeInTheDocument();
    expect(screen.getByText("Último motivo: Fraude")).toBeInTheDocument();
  });

  it("lista un negocio bloqueado: nombre, email del dueño, badge y motivo", async () => {
    mockRpc([], [bloqueadoRow]);
    renderPage();

    expect(await screen.findByText("Negocio Bloqueado")).toBeInTheDocument();
    expect(screen.getByText("dueno2@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bloqueado")).toBeInTheDocument();
    expect(screen.getByText("Motivo: Contenido spam")).toBeInTheDocument();
  });

  it("muestra el mensaje de error si falla el RPC de pendientes", async () => {
    supabase.rpc.mockImplementation((fn: string) => {
      if (fn === "admin_list_negocios_reportados_pendientes") {
        return Promise.resolve({ data: null, error: { message: "boom pendientes" } });
      }
      return Promise.resolve({ data: [], error: null });
    });
    renderPage();
    expect(await screen.findByText("boom pendientes")).toBeInTheDocument();
  });

  it("muestra el mensaje de error si falla el RPC de bloqueados", async () => {
    supabase.rpc.mockImplementation((fn: string) => {
      if (fn === "admin_list_negocios_bloqueados") {
        return Promise.resolve({ data: null, error: { message: "boom bloqueados" } });
      }
      return Promise.resolve({ data: [], error: null });
    });
    renderPage();
    expect(await screen.findByText("boom bloqueados")).toBeInTheDocument();
  });

  it("buscar en el listado de pendientes llama al RPC con el email (debounced) sin afectar el de bloqueados", async () => {
    mockRpc([], []);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith(
        "admin_list_negocios_reportados_pendientes",
        { p_email_search: null },
      ),
    );
    supabase.rpc.mockClear();

    const [pendientesInput] = screen.getAllByPlaceholderText("Buscar por correo del dueño…");
    await user.type(pendientesInput, "dueno1@example.com");

    await waitFor(
      () =>
        expect(supabase.rpc).toHaveBeenCalledWith(
          "admin_list_negocios_reportados_pendientes",
          { p_email_search: "dueno1@example.com" },
        ),
      { timeout: 2000 },
    );
    expect(supabase.rpc).not.toHaveBeenCalledWith(
      "admin_list_negocios_bloqueados",
      { p_email_search: "dueno1@example.com" },
    );
  });

  it("muestra el mensaje de 'sin resultados' de búsqueda cuando hay texto pero no hay filas", async () => {
    mockRpc([], []);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("No hay negocios bloqueados.");

    const [, bloqueadosInput] = screen.getAllByPlaceholderText("Buscar por correo del dueño…");
    await user.type(bloqueadosInput, "nadie@example.com");

    expect(
      await screen.findByText("No se encontraron negocios con ese correo."),
    ).toBeInTheDocument();
  });
});
