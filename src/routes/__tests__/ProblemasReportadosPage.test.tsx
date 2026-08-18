import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProblemasReportadosPage from "../ProblemasReportadosPage";
import type { ProblemaReportado } from "../../lib/types";

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
}));
vi.mock("../../supabaseClient", () => ({ supabase }));

interface QueryResult {
  data: unknown;
  count?: number | null;
  error: { message: string } | null;
}

// Cada .select() crea un builder nuevo cuyo "modo" (pendientes vs
// resueltos) se determina por si se llamó .eq("estado", "pendiente") o
// .in("estado", [...]) — así una sola factory de mock alcanza para las 2
// listas independientes de la pantalla. .update() es un camino aparte, no
// interferido por el modo del builder de select.
function makeStaticFromMock(opts: {
  pendientes?: QueryResult;
  resueltos?: QueryResult;
  updateResult?: { error: { message: string } | null };
  pending?: boolean;
}) {
  const pendientesResult = opts.pendientes ?? { data: [], count: 0, error: null };
  const resueltosResult = opts.resueltos ?? { data: [], count: 0, error: null };
  const updateResult = opts.updateResult ?? { error: null };

  const pendientesBuilders: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const resueltosBuilders: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const updateMock = vi.fn((_payload: unknown) => ({
    eq: vi.fn(() => Promise.resolve(updateResult)),
  }));

  const fromFn = vi.fn(() => ({
    select: vi.fn(() => {
      const builder: Record<string, unknown> = {};
      let mode: "pendientes" | "resueltos" | null = null;
      const self = () => builder;
      builder.eq = vi.fn(() => {
        mode = "pendientes";
        pendientesBuilders.push(builder as never);
        return builder;
      });
      builder.in = vi.fn(() => {
        mode = "resueltos";
        resueltosBuilders.push(builder as never);
        return builder;
      });
      builder.order = vi.fn(self);
      builder.range = vi.fn(self);
      builder.gte = vi.fn(self);
      builder.lte = vi.fn(self);
      builder.then = (
        onFulfilled?: (v: QueryResult) => unknown,
        onRejected?: (r: unknown) => unknown,
      ) => {
        if (opts.pending) return new Promise(() => {});
        const result = mode === "pendientes" ? pendientesResult : resueltosResult;
        return Promise.resolve(result).then(onFulfilled, onRejected);
      };
      return builder;
    }),
    update: updateMock,
  }));

  return { fromFn, updateMock, pendientesBuilders, resueltosBuilders };
}

// Versión con estado mutable compartido, para probar que confirmar una
// acción efectivamente mueve el ítem de una lista a la otra al recargar —
// mismo patrón que BusinessDetailPage.test.tsx's setupMocks.
function makeStatefulFromMock(items: ProblemaReportado[]) {
  const updateMock = vi.fn((payload: Partial<ProblemaReportado>) => ({
    eq: vi.fn((_col: string, id: string) => {
      const idx = items.findIndex((i) => i.id === id);
      if (idx >= 0) items[idx] = { ...items[idx], ...payload } as ProblemaReportado;
      return Promise.resolve({ error: null });
    }),
  }));

  const fromFn = vi.fn(() => ({
    select: vi.fn(() => {
      const builder: Record<string, unknown> = {};
      let mode: "pendientes" | "resueltos" = "pendientes";
      const self = () => builder;
      builder.eq = vi.fn(() => {
        mode = "pendientes";
        return builder;
      });
      builder.in = vi.fn(() => {
        mode = "resueltos";
        return builder;
      });
      builder.order = vi.fn(self);
      builder.range = vi.fn(self);
      builder.gte = vi.fn(self);
      builder.lte = vi.fn(self);
      builder.then = (
        onFulfilled?: (v: QueryResult) => unknown,
        onRejected?: (r: unknown) => unknown,
      ) => {
        const filtered =
          mode === "pendientes"
            ? items.filter((i) => i.estado === "pendiente")
            : items.filter((i) => i.estado !== "pendiente");
        return Promise.resolve({
          data: filtered,
          count: filtered.length,
          error: null,
        }).then(onFulfilled, onRejected);
      };
      return builder;
    }),
    update: updateMock,
  }));

  return { fromFn, updateMock };
}

function problema(overrides: Partial<ProblemaReportado> = {}): ProblemaReportado {
  return {
    id: "p1",
    id_persona: "u1",
    descripcion_problema: "La app se cierra al abrir el mapa",
    fecha_creacion: "2026-08-01T12:00:00Z",
    estado: "pendiente",
    justificacion: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProblemasReportadosPage", () => {
  it("muestra 'Cargando…' en ambas listas antes de resolver", () => {
    const { fromFn } = makeStaticFromMock({ pending: true });
    supabase.from.mockImplementation(fromFn);
    render(<ProblemasReportadosPage />);
    expect(screen.getAllByText("Cargando…")).toHaveLength(2);
  });

  it("muestra el estado vacío de cada lista de forma independiente", async () => {
    const { fromFn } = makeStaticFromMock({});
    supabase.from.mockImplementation(fromFn);
    render(<ProblemasReportadosPage />);
    expect(
      await screen.findByText("No hay problemas pendientes en este rango."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "No hay problemas descartados o solucionados en este rango.",
      ),
    ).toBeInTheDocument();
  });

  it("lista un problema pendiente con sus botones de acción", async () => {
    const { fromFn } = makeStaticFromMock({
      pendientes: { data: [problema()], count: 1, error: null },
    });
    supabase.from.mockImplementation(fromFn);
    render(<ProblemasReportadosPage />);

    expect(
      await screen.findByText("La app se cierra al abrir el mapa"),
    ).toBeInTheDocument();
    expect(screen.getByText("Descartar")).toBeInTheDocument();
    expect(screen.getByText("Marcar como solucionado")).toBeInTheDocument();
  });

  it("lista un problema resuelto con su badge, justificación y acciones", async () => {
    const { fromFn } = makeStaticFromMock({
      resueltos: {
        data: [
          problema({
            id: "p2",
            estado: "descartado",
            justificacion: "Ya no aplica",
          }),
        ],
        count: 1,
        error: null,
      },
    });
    supabase.from.mockImplementation(fromFn);
    render(<ProblemasReportadosPage />);

    expect(await screen.findByText("Descartado")).toBeInTheDocument();
    expect(screen.getByText("Justificación: Ya no aplica")).toBeInTheDocument();
    expect(screen.getByText("Volver a pendiente")).toBeInTheDocument();
    expect(screen.getByText("Marcar como solucionado")).toBeInTheDocument();
  });

  it("cada lista pagina de forma independiente (20 por página)", async () => {
    const { fromFn } = makeStaticFromMock({
      pendientes: { data: [problema()], count: 45, error: null },
      resueltos: {
        data: [problema({ id: "p2", estado: "solucionado", justificacion: "x" })],
        count: 21,
        error: null,
      },
    });
    supabase.from.mockImplementation(fromFn);
    render(<ProblemasReportadosPage />);

    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    expect(await screen.findByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("muestra el error de cada lista de forma independiente", async () => {
    const { fromFn } = makeStaticFromMock({
      pendientes: { data: null, count: null, error: { message: "boom pendientes" } },
      resueltos: { data: null, count: null, error: { message: "boom resueltos" } },
    });
    supabase.from.mockImplementation(fromFn);
    render(<ProblemasReportadosPage />);

    expect(await screen.findByText("boom pendientes")).toBeInTheDocument();
    expect(await screen.findByText("boom resueltos")).toBeInTheDocument();
  });

  it("cambiar el filtro de fecha de 'Pendientes' resetea su página y filtra por fecha, sin afectar 'Resueltos'", async () => {
    const { fromFn, pendientesBuilders } = makeStaticFromMock({
      pendientes: { data: [problema()], count: 25, error: null },
    });
    supabase.from.mockImplementation(fromFn);
    const user = userEvent.setup();
    render(<ProblemasReportadosPage />);
    await screen.findByText("Página 1 de 2");

    const [desdePendientes] = screen.getAllByLabelText("Desde");
    await user.type(desdePendientes, "2026-08-01");

    await waitFor(() => {
      const last = pendientesBuilders[pendientesBuilders.length - 1];
      expect(last.gte).toHaveBeenCalledWith(
        "fecha_creacion",
        "2026-08-01T00:00:00.000Z",
      );
    });
  });

  it("el botón 'Confirmar' del modal está deshabilitado sin justificación al descartar", async () => {
    const { fromFn } = makeStaticFromMock({
      pendientes: { data: [problema()], count: 1, error: null },
    });
    supabase.from.mockImplementation(fromFn);
    const user = userEvent.setup();
    render(<ProblemasReportadosPage />);
    await user.click(await screen.findByText("Descartar"));

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    await user.type(
      screen.getByPlaceholderText("Explica el motivo…"),
      "Duplicado",
    );
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("'Cancelar' cierra el modal sin llamar a update", async () => {
    const { fromFn, updateMock } = makeStaticFromMock({
      pendientes: { data: [problema()], count: 1, error: null },
    });
    supabase.from.mockImplementation(fromFn);
    const user = userEvent.setup();
    render(<ProblemasReportadosPage />);
    await user.click(await screen.findByText("Descartar"));
    await user.click(screen.getByText("Cancelar"));

    expect(screen.queryByText("Justificación")).not.toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("descartar un pendiente lo mueve a la lista de resueltos con su justificación", async () => {
    const items = [problema()];
    const { fromFn, updateMock } = makeStatefulFromMock(items);
    supabase.from.mockImplementation(fromFn);
    const user = userEvent.setup();
    render(<ProblemasReportadosPage />);

    await user.click(await screen.findByText("Descartar"));
    await user.type(
      screen.getByPlaceholderText("Explica el motivo…"),
      "Ya resuelto en otra versión",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({
        estado: "descartado",
        justificacion: "Ya resuelto en otra versión",
      }),
    );
    expect(
      await screen.findByText("No hay problemas pendientes en este rango."),
    ).toBeInTheDocument();
    expect(screen.getByText("Descartado")).toBeInTheDocument();
    expect(
      screen.getByText("Justificación: Ya resuelto en otra versión"),
    ).toBeInTheDocument();
  });

  it("'Volver a pendiente' no pide justificación y limpia la anterior", async () => {
    const items = [
      problema({ estado: "solucionado", justificacion: "Arreglado" }),
    ];
    const { fromFn, updateMock } = makeStatefulFromMock(items);
    supabase.from.mockImplementation(fromFn);
    const user = userEvent.setup();
    render(<ProblemasReportadosPage />);

    await user.click(await screen.findByText("Volver a pendiente"));
    expect(screen.queryByText("Justificación")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({
        estado: "pendiente",
        justificacion: null,
      }),
    );
    expect(
      await screen.findByText("La app se cierra al abrir el mapa"),
    ).toBeInTheDocument();
  });

  it("un error al confirmar se muestra dentro del modal sin cerrarlo", async () => {
    const { fromFn } = makeStaticFromMock({
      pendientes: { data: [problema()], count: 1, error: null },
      updateResult: { error: { message: "fallo de red" } },
    });
    supabase.from.mockImplementation(fromFn);
    const user = userEvent.setup();
    render(<ProblemasReportadosPage />);

    await user.click(await screen.findByText("Descartar"));
    await user.type(
      screen.getByPlaceholderText("Explica el motivo…"),
      "motivo",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("fallo de red")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Explica el motivo…")).toBeInTheDocument();
  });
});
