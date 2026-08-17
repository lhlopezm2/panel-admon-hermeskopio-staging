import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReportsListPage from "../ReportsListPage";
import { chainable } from "../../test/chainable";
import type { Business, Report } from "../../lib/types";

const { supabase } = vi.hoisted(() => ({
  supabase: {
    from: vi.fn(),
    auth: { signOut: vi.fn() },
  },
}));

vi.mock("../../supabaseClient", () => ({ supabase }));

const defaultBusiness: Business = {
  id: "b1",
  nombre: "Negocio 1",
  ciudad: "Cali",
  departamento: "Valle",
  bloqueado: false,
  motivo_bloqueo: null,
  bloqueado_en: null,
};

function reportRow(overrides: Partial<Report> = {}): Report {
  return {
    id: "r1",
    id_negocio: "b1",
    id_persona: "p1",
    reason: "spam_falso",
    comment: null,
    status: "pendiente",
    fecha_creacion: "2026-08-01T00:00:00Z",
    businesses: defaultBusiness,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportsListPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportsListPage", () => {
  it("muestra 'Cargando…' antes de resolver la consulta", () => {
    supabase.from.mockReturnValue(chainable({ data: null, error: null }));
    renderPage();
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay reportes", async () => {
    supabase.from.mockReturnValue(chainable({ data: [], error: null }));
    renderPage();
    expect(
      await screen.findByText("No hay reportes pendientes."),
    ).toBeInTheDocument();
  });

  it("muestra el mensaje de error si falla el fetch", async () => {
    supabase.from.mockReturnValue(
      chainable({ data: null, error: { message: "boom" } }),
    );
    renderPage();
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("agrupa los reportes por negocio", async () => {
    const b2: Business = { ...defaultBusiness, id: "b2", nombre: "Negocio 2" };
    supabase.from.mockReturnValue(
      chainable({
        data: [
          reportRow({ id: "r1", id_negocio: "b1", status: "accionado" }),
          reportRow({ id: "r2", id_negocio: "b1", status: "accionado" }),
          reportRow({
            id: "r3",
            id_negocio: "b2",
            status: "accionado",
            businesses: b2,
          }),
        ],
        error: null,
      }),
    );
    renderPage();
    expect(await screen.findByText("Negocio 1")).toBeInTheDocument();
    expect(screen.getByText("Negocio 2")).toBeInTheDocument();
    expect(screen.getByText("2 reportes", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("1 reporte", { selector: "span" })).toBeInTheDocument();
  });

  it("descarta filas cuyo negocio es null", async () => {
    supabase.from.mockReturnValue(
      chainable({ data: [reportRow({ id: "r1", businesses: null })], error: null }),
    );
    renderPage();
    expect(
      await screen.findByText("No hay reportes pendientes."),
    ).toBeInTheDocument();
  });

  it("ordena los negocios por número total de reportes, de mayor a menor", async () => {
    const pocos: Business = { ...defaultBusiness, id: "b1", nombre: "Pocos reportes" };
    const muchos: Business = { ...defaultBusiness, id: "b2", nombre: "Muchos reportes" };
    supabase.from.mockReturnValue(
      chainable({
        data: [
          reportRow({ id: "r1", id_negocio: "b1", status: "accionado", businesses: pocos }),
          reportRow({ id: "r2", id_negocio: "b2", status: "accionado", businesses: muchos }),
          reportRow({ id: "r3", id_negocio: "b2", status: "accionado", businesses: muchos }),
          reportRow({ id: "r4", id_negocio: "b2", status: "accionado", businesses: muchos }),
        ],
        error: null,
      }),
    );
    renderPage();
    await screen.findByText("Muchos reportes");

    const links = screen.getAllByRole("link").map((el) => el.textContent ?? "");
    const idxMuchos = links.findIndex((t) => t.includes("Muchos reportes"));
    const idxPocos = links.findIndex((t) => t.includes("Pocos reportes"));
    expect(idxMuchos).toBeGreaterThanOrEqual(0);
    expect(idxPocos).toBeGreaterThanOrEqual(0);
    expect(idxMuchos).toBeLessThan(idxPocos);
  });

  it("cuenta solo los reportes en estado 'pendiente' en el sufijo", async () => {
    supabase.from.mockReturnValue(
      chainable({
        data: [
          reportRow({ id: "r1", status: "pendiente" }),
          reportRow({ id: "r2", status: "accionado" }),
          reportRow({ id: "r3", status: "descartado" }),
        ],
        error: null,
      }),
    );
    renderPage();
    expect(
      await screen.findByText("3 reportes (1 pendiente)", { selector: "span" }),
    ).toBeInTheDocument();
  });

  it("muestra el badge 'Bloqueado' cuando el negocio está bloqueado", async () => {
    supabase.from.mockReturnValue(
      chainable({
        data: [reportRow({ businesses: { ...defaultBusiness, bloqueado: true } })],
        error: null,
      }),
    );
    renderPage();
    expect(await screen.findByText("Bloqueado")).toBeInTheDocument();
  });

  it("no muestra el badge 'Bloqueado' cuando el negocio no está bloqueado", async () => {
    supabase.from.mockReturnValue(
      chainable({ data: [reportRow()], error: null }),
    );
    renderPage();
    await screen.findByText("Negocio 1");
    expect(screen.queryByText("Bloqueado")).not.toBeInTheDocument();
  });

  it("muestra el motivo del reporte más reciente ('Último motivo')", async () => {
    supabase.from.mockReturnValue(
      chainable({ data: [reportRow({ id: "r1", reason: "fraude" })], error: null }),
    );
    renderPage();
    expect(
      await screen.findByText("Último motivo: Fraude"),
    ).toBeInTheDocument();
  });

  it("cierra sesión al hacer click en 'Cerrar sesión'", async () => {
    supabase.from.mockReturnValue(chainable({ data: [], error: null }));
    supabase.auth.signOut.mockResolvedValue({ error: null });
    renderPage();

    fireEvent.click(await screen.findByText("Cerrar sesión"));

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
