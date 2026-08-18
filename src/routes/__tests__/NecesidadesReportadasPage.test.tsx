import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NecesidadesReportadasPage from "../NecesidadesReportadasPage";
import type { NecesidadReportada } from "../../lib/types";

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
}));
vi.mock("../../supabaseClient", () => ({ supabase }));

const { toCsv, downloadCsv } = vi.hoisted(() => ({
  toCsv: vi.fn(() => "CSV_CONTENT"),
  downloadCsv: vi.fn(),
}));
vi.mock("../../lib/csv", () => ({ toCsv, downloadCsv }));

interface QueryResult {
  data: unknown;
  count?: number | null;
  error: { message: string } | null;
}

function makeQueryMock(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.order = vi.fn(self);
  builder.range = vi.fn(self);
  builder.gte = vi.fn(self);
  builder.lte = vi.fn(self);
  builder.then = (
    onFulfilled?: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return builder as typeof builder & {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
  };
}

function necesidad(overrides: Partial<NecesidadReportada> = {}): NecesidadReportada {
  return {
    id: "n1",
    id_persona: "p1",
    descripcion_necesidad: "Necesito más visibilidad en el mapa",
    fecha_creacion: "2026-08-01T12:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NecesidadesReportadasPage", () => {
  it("muestra 'Cargando…' antes de resolver", () => {
    supabase.from.mockReturnValue(makeQueryMock(new Promise(() => {}) as never));
    render(<NecesidadesReportadasPage />);
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay necesidades", async () => {
    supabase.from.mockReturnValue(makeQueryMock({ data: [], count: 0, error: null }));
    render(<NecesidadesReportadasPage />);
    expect(
      await screen.findByText("No hay necesidades reportadas en este rango."),
    ).toBeInTheDocument();
  });

  it("lista las necesidades con fecha y descripción", async () => {
    supabase.from.mockReturnValue(
      makeQueryMock({ data: [necesidad()], count: 1, error: null }),
    );
    render(<NecesidadesReportadasPage />);
    expect(
      await screen.findByText("Necesito más visibilidad en el mapa"),
    ).toBeInTheDocument();
  });

  it("muestra el número total de páginas (20 por página)", async () => {
    supabase.from.mockReturnValue(
      makeQueryMock({ data: [necesidad()], count: 45, error: null }),
    );
    render(<NecesidadesReportadasPage />);
    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("muestra el mensaje de error si falla la consulta", async () => {
    supabase.from.mockReturnValue(
      makeQueryMock({ data: null, count: null, error: { message: "boom" } }),
    );
    render(<NecesidadesReportadasPage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("cambiar el filtro 'Desde' resetea a la página 1 y filtra la consulta por fecha", async () => {
    const builder = makeQueryMock({ data: [necesidad()], count: 25, error: null });
    supabase.from.mockReturnValue(builder);
    const user = userEvent.setup();
    render(<NecesidadesReportadasPage />);
    await screen.findByText("Página 1 de 2");

    await user.click(screen.getByText("Siguiente →"));
    await screen.findByText("Página 2 de 2");

    const [desdeInput] = screen.getAllByLabelText("Desde");
    await user.type(desdeInput, "2026-08-01");

    await waitFor(() => screen.getByText("Página 1 de 2"));
    expect(builder.gte).toHaveBeenCalledWith(
      "fecha_creacion",
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("el botón 'Descargar' del modal está deshabilitado hasta elegir ambas fechas", async () => {
    supabase.from.mockReturnValue(
      makeQueryMock({ data: [], count: 0, error: null }),
    );
    const user = userEvent.setup();
    render(<NecesidadesReportadasPage />);
    await screen.findByText("No hay necesidades reportadas en este rango.");

    await user.click(screen.getByText("Descargar CSV"));
    expect(screen.getByRole("button", { name: "Descargar" })).toBeDisabled();

    const [, desdeModal] = screen.getAllByLabelText("Desde");
    await user.type(desdeModal, "2026-08-01");
    expect(screen.getByRole("button", { name: "Descargar" })).toBeDisabled();

    const [, hastaModal] = screen.getAllByLabelText("Hasta");
    await user.type(hastaModal, "2026-08-17");
    expect(screen.getByRole("button", { name: "Descargar" })).toBeEnabled();
  });

  it("el modal de descarga se prellena con el filtro activo de la lista", async () => {
    supabase.from.mockReturnValue(
      makeQueryMock({ data: [], count: 0, error: null }),
    );
    const user = userEvent.setup();
    render(<NecesidadesReportadasPage />);
    await screen.findByText("No hay necesidades reportadas en este rango.");

    const [desdeLista] = screen.getAllByLabelText("Desde");
    await user.type(desdeLista, "2026-08-01");
    const [hastaLista] = screen.getAllByLabelText("Hasta");
    await user.type(hastaLista, "2026-08-17");

    await user.click(screen.getByText("Descargar CSV"));
    const [, desdeModal] = screen.getAllByLabelText("Desde") as HTMLInputElement[];
    const [, hastaModal] = screen.getAllByLabelText("Hasta") as HTMLInputElement[];
    expect(desdeModal).toHaveValue("2026-08-01");
    expect(hastaModal).toHaveValue("2026-08-17");
  });

  it("descargar genera el CSV con la columna 'Descripcion' y cierra el modal", async () => {
    supabase.from.mockReturnValue(
      makeQueryMock({ data: [], count: 0, error: null }),
    );
    const user = userEvent.setup();
    render(<NecesidadesReportadasPage />);
    await screen.findByText("No hay necesidades reportadas en este rango.");

    await user.click(screen.getByText("Descargar CSV"));
    const [, desdeModal] = screen.getAllByLabelText("Desde");
    await user.type(desdeModal, "2026-08-01");
    const [, hastaModal] = screen.getAllByLabelText("Hasta");
    await user.type(hastaModal, "2026-08-17");

    supabase.from.mockReturnValue(
      makeQueryMock({
        data: [
          { descripcion_necesidad: "d1" },
          { descripcion_necesidad: "d2" },
        ],
        error: null,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Descargar" }));

    await waitFor(() =>
      expect(toCsv).toHaveBeenCalledWith("Descripcion", ["d1", "d2"]),
    );
    expect(downloadCsv).toHaveBeenCalledWith(
      "necesidades_2026-08-01_a_2026-08-17.csv",
      "CSV_CONTENT",
    );
    expect(
      screen.queryByText("Descargar necesidades reportadas"),
    ).not.toBeInTheDocument();
  });

  it("descargar con error de red muestra el mensaje inline y no cierra el modal", async () => {
    supabase.from.mockReturnValue(
      makeQueryMock({ data: [], count: 0, error: null }),
    );
    const user = userEvent.setup();
    render(<NecesidadesReportadasPage />);
    await screen.findByText("No hay necesidades reportadas en este rango.");

    await user.click(screen.getByText("Descargar CSV"));
    const [, desdeModal] = screen.getAllByLabelText("Desde");
    await user.type(desdeModal, "2026-08-01");
    const [, hastaModal] = screen.getAllByLabelText("Hasta");
    await user.type(hastaModal, "2026-08-17");

    supabase.from.mockReturnValue(
      makeQueryMock({ data: null, error: { message: "fallo de red" } }),
    );

    await user.click(screen.getByRole("button", { name: "Descargar" }));

    expect(await screen.findByText("fallo de red")).toBeInTheDocument();
    expect(downloadCsv).not.toHaveBeenCalled();
    expect(
      screen.getByText("Descargar necesidades reportadas"),
    ).toBeInTheDocument();
  });

  it("'Cancelar' cierra el modal sin descargar", async () => {
    supabase.from.mockReturnValue(
      makeQueryMock({ data: [], count: 0, error: null }),
    );
    const user = userEvent.setup();
    render(<NecesidadesReportadasPage />);
    await screen.findByText("No hay necesidades reportadas en este rango.");

    await user.click(screen.getByText("Descargar CSV"));
    await user.click(screen.getByText("Cancelar"));

    expect(
      screen.queryByText("Descargar necesidades reportadas"),
    ).not.toBeInTheDocument();
    expect(downloadCsv).not.toHaveBeenCalled();
  });
});
