import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BusinessDetailPage from "../BusinessDetailPage";
import { chainable } from "../../test/chainable";
import type { Business, BloqueoHistorialRow, Report } from "../../lib/types";

const { supabase } = vi.hoisted(() => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("../../supabaseClient", () => ({ supabase }));

const defaultBusiness: Business = {
  id: "b1",
  nombre: "Negocio Test",
  ciudad: "Cali",
  departamento: "Valle",
  bloqueado: false,
  motivo_bloqueo: null,
  bloqueado_en: null,
};

interface MockState {
  business: Business;
  reports: Report[];
  historial: BloqueoHistorialRow[];
}

function setupMocks(
  overrides: Partial<{ business: Business; reports: Report[]; historial: BloqueoHistorialRow[] }> = {},
) {
  const state: MockState = {
    business: overrides.business ?? { ...defaultBusiness },
    reports: overrides.reports ?? [],
    historial: overrides.historial ?? [],
  };

  const businessBuilder = chainable(() => ({ data: state.business, error: null }));
  const reportsBuilder = chainable(() => ({ data: state.reports, error: null }));
  const historialBuilder = chainable(() => ({ data: state.historial, error: null }));

  supabase.from.mockImplementation((table: string) => {
    if (table === "businesses") return businessBuilder;
    if (table === "reports") return reportsBuilder;
    if (table === "bloqueo_historial") return historialBuilder;
    throw new Error(`tabla inesperada: ${table}`);
  });

  supabase.functions.invoke.mockResolvedValue({ data: { sent: true }, error: null });

  return { state, businessBuilder, reportsBuilder, historialBuilder };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/negocio/b1"]}>
      <Routes>
        <Route path="/negocio/:id" element={<BusinessDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const MOTIVO_PLACEHOLDER = "Describe por qué se bloquea este negocio…";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BusinessDetailPage", () => {
  it("muestra 'Cargando…' mientras no hay negocio", () => {
    setupMocks();
    renderPage();
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("carga negocio, reportes e historial y los muestra", async () => {
    setupMocks({
      business: { ...defaultBusiness },
      reports: [
        {
          id: "r1",
          id_negocio: "b1",
          id_persona: "p1",
          reason: "spam_falso",
          comment: "es spam",
          status: "pendiente",
          fecha_creacion: "2026-08-01T00:00:00Z",
          businesses: null,
        },
      ],
    });
    renderPage();

    expect(await screen.findByText("Negocio Test")).toBeInTheDocument();
    expect(screen.getByText("Cali · Valle")).toBeInTheDocument();
    expect(screen.getByText("Reportes (1)")).toBeInTheDocument();
    expect(screen.getByText("es spam")).toBeInTheDocument();
  });

  it("muestra la rama no-bloqueado con el formulario de motivo", async () => {
    setupMocks({ business: { ...defaultBusiness, bloqueado: false } });
    renderPage();
    expect(await screen.findByPlaceholderText(MOTIVO_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByText("Negocio bloqueado")).not.toBeInTheDocument();
  });

  it("el botón 'Bloquear negocio' está deshabilitado sin motivo", async () => {
    setupMocks({ business: { ...defaultBusiness, bloqueado: false } });
    renderPage();
    expect(await screen.findByRole("button", { name: "Bloquear negocio" })).toBeDisabled();
  });

  it("el botón 'Bloquear negocio' se habilita al escribir un motivo", async () => {
    setupMocks({ business: { ...defaultBusiness, bloqueado: false } });
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByPlaceholderText(MOTIVO_PLACEHOLDER), "x");
    expect(screen.getByRole("button", { name: "Bloquear negocio" })).toBeEnabled();
  });

  it("handleBlock camino feliz: bloquea, limpia el formulario y envía el correo", async () => {
    const { state } = setupMocks({ business: { ...defaultBusiness, bloqueado: false } });
    supabase.rpc.mockImplementation((fn: string, params: { p_motivo: string }) => {
      if (fn === "block_negocio") {
        state.business = {
          ...state.business,
          bloqueado: true,
          motivo_bloqueo: params.p_motivo,
          bloqueado_en: "2026-08-17T00:00:00Z",
        };
        state.historial = [
          {
            id: "hist-1",
            id_negocio: "b1",
            id_admin: "admin1",
            accion: "bloqueo",
            motivo: params.p_motivo,
            fecha: "2026-08-17T00:00:00Z",
            email_enviado: false,
            email_enviado_en: null,
          },
        ];
        return Promise.resolve({ data: "hist-1", error: null });
      }
      throw new Error(`rpc inesperado: ${fn}`);
    });

    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByPlaceholderText(MOTIVO_PLACEHOLDER), "Contenido spam");
    await user.click(screen.getByRole("button", { name: "Bloquear negocio" }));

    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith("block_negocio", {
        p_negocio_id: "b1",
        p_motivo: "Contenido spam",
      }),
    );

    expect(await screen.findByText("Negocio bloqueado")).toBeInTheDocument();
    expect(screen.getByText("Motivo: Contenido spam")).toBeInTheDocument();
    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith("send-bloqueo-email", {
        body: { negocio_id: "b1", historial_id: "hist-1" },
      }),
    );
    expect(await screen.findByText("Correo de notificación enviado.")).toBeInTheDocument();
  });

  it("handleBlock con error BL001 muestra 'ya estaba bloqueado' y recarga igual", async () => {
    setupMocks({ business: { ...defaultBusiness, bloqueado: false } });
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "ya bloqueado", code: "BL001" },
    });

    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByPlaceholderText(MOTIVO_PLACEHOLDER), "motivo");
    await user.click(screen.getByRole("button", { name: "Bloquear negocio" }));

    expect(
      await screen.findByText("Este negocio ya estaba bloqueado."),
    ).toBeInTheDocument();
  });

  it("handleBlock con error genérico muestra error.message y no recarga", async () => {
    setupMocks({ business: { ...defaultBusiness, bloqueado: false } });
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "fallo de red", code: "OTHER" },
    });

    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByPlaceholderText(MOTIVO_PLACEHOLDER), "motivo");
    const fromCallsBefore = supabase.from.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Bloquear negocio" }));

    expect(await screen.findByText("fallo de red")).toBeInTheDocument();
    expect(supabase.from.mock.calls.length).toBe(fromCallsBefore);
  });

  it("handleUnblock camino feliz recarga y vuelve a mostrar el formulario", async () => {
    const { state } = setupMocks({
      business: {
        ...defaultBusiness,
        bloqueado: true,
        motivo_bloqueo: "x",
        bloqueado_en: "2026-08-01T00:00:00Z",
      },
    });
    supabase.rpc.mockImplementation((fn: string) => {
      if (fn === "unblock_negocio") {
        state.business = { ...state.business, bloqueado: false, motivo_bloqueo: null, bloqueado_en: null };
        return Promise.resolve({ error: null });
      }
      throw new Error(`rpc inesperado: ${fn}`);
    });

    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Desbloquear" }));

    expect(await screen.findByPlaceholderText(MOTIVO_PLACEHOLDER)).toBeInTheDocument();
  });

  it("handleUnblock con error BL002 muestra 'ya estaba desbloqueado'", async () => {
    setupMocks({
      business: {
        ...defaultBusiness,
        bloqueado: true,
        motivo_bloqueo: "x",
        bloqueado_en: "2026-08-01T00:00:00Z",
      },
    });
    supabase.rpc.mockResolvedValue({ error: { message: "ya desbloqueado", code: "BL002" } });

    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Desbloquear" }));

    expect(
      await screen.findByText("Este negocio ya estaba desbloqueado."),
    ).toBeInTheDocument();
  });

  it("handleUnblock con error genérico muestra error.message", async () => {
    setupMocks({
      business: {
        ...defaultBusiness,
        bloqueado: true,
        motivo_bloqueo: "x",
        bloqueado_en: "2026-08-01T00:00:00Z",
      },
    });
    supabase.rpc.mockResolvedValue({ error: { message: "fallo inesperado", code: "OTHER" } });

    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Desbloquear" }));

    expect(await screen.findByText("fallo inesperado")).toBeInTheDocument();
  });

  it("handleUnblock siempre recarga, incluso si hubo error", async () => {
    setupMocks({
      business: {
        ...defaultBusiness,
        bloqueado: true,
        motivo_bloqueo: "x",
        bloqueado_en: "2026-08-01T00:00:00Z",
      },
    });
    supabase.rpc.mockResolvedValue({ error: { message: "fallo inesperado", code: "OTHER" } });

    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("button", { name: "Desbloquear" });
    const fromCallsBefore = supabase.from.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Desbloquear" }));
    await screen.findByText("fallo inesperado");

    expect(supabase.from.mock.calls.length).toBeGreaterThan(fromCallsBefore);
  });

  it("sendNotificationEmail exitoso muestra 'Correo de notificación enviado.'", async () => {
    setupMocks({
      business: {
        ...defaultBusiness,
        bloqueado: true,
        motivo_bloqueo: "x",
        bloqueado_en: "2026-08-01T00:00:00Z",
      },
      historial: [
        {
          id: "h1",
          id_negocio: "b1",
          id_admin: "a1",
          accion: "bloqueo",
          motivo: "x",
          fecha: "2026-08-01T00:00:00Z",
          email_enviado: false,
          email_enviado_en: null,
        },
      ],
    });
    supabase.functions.invoke.mockResolvedValue({ data: { sent: true }, error: null });

    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Reintentar"));

    expect(supabase.functions.invoke).toHaveBeenCalledWith("send-bloqueo-email", {
      body: { negocio_id: "b1", historial_id: "h1" },
    });
    expect(await screen.findByText("Correo de notificación enviado.")).toBeInTheDocument();
  });

  it("sendNotificationEmail fallido mantiene 'Correo no enviado.'", async () => {
    setupMocks({
      business: {
        ...defaultBusiness,
        bloqueado: true,
        motivo_bloqueo: "x",
        bloqueado_en: "2026-08-01T00:00:00Z",
      },
      historial: [
        {
          id: "h1",
          id_negocio: "b1",
          id_admin: "a1",
          accion: "bloqueo",
          motivo: "x",
          fecha: "2026-08-01T00:00:00Z",
          email_enviado: false,
          email_enviado_en: null,
        },
      ],
    });
    supabase.functions.invoke.mockResolvedValue({ data: { sent: false }, error: null });

    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Reintentar"));

    expect(await screen.findByText("Correo no enviado.")).toBeInTheDocument();
  });

  it("sin registros de bloqueo en el historial no muestra estado de correo ni botón Reintentar", async () => {
    setupMocks({
      business: {
        ...defaultBusiness,
        bloqueado: true,
        motivo_bloqueo: "x",
        bloqueado_en: "2026-08-01T00:00:00Z",
      },
      historial: [],
    });
    renderPage();

    await screen.findByText("Negocio bloqueado");
    expect(screen.queryByText("Correo de notificación enviado.")).not.toBeInTheDocument();
    expect(screen.queryByText("Correo no enviado.")).not.toBeInTheDocument();
    expect(screen.queryByText("Reintentar")).not.toBeInTheDocument();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("handleDismissReport actualiza el status a 'descartado' y recarga", async () => {
    const { reportsBuilder } = setupMocks({
      business: { ...defaultBusiness, bloqueado: false },
      reports: [
        {
          id: "r1",
          id_negocio: "b1",
          id_persona: "p1",
          reason: "spam_falso",
          comment: null,
          status: "pendiente",
          fecha_creacion: "2026-08-01T00:00:00Z",
          businesses: null,
        },
      ],
    });

    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Descartar"));

    await waitFor(() =>
      expect(reportsBuilder.update).toHaveBeenCalledWith({ status: "descartado" }),
    );
    expect(reportsBuilder.eq).toHaveBeenCalledWith("id", "r1");
  });

  it("el botón 'Descartar' solo aparece en reportes en estado 'pendiente'", async () => {
    setupMocks({
      business: { ...defaultBusiness, bloqueado: false },
      reports: [
        {
          id: "r1",
          id_negocio: "b1",
          id_persona: "p1",
          reason: "spam_falso",
          comment: null,
          status: "pendiente",
          fecha_creacion: "2026-08-01T00:00:00Z",
          businesses: null,
        },
        {
          id: "r2",
          id_negocio: "b1",
          id_persona: "p2",
          reason: "fraude",
          comment: null,
          status: "accionado",
          fecha_creacion: "2026-08-02T00:00:00Z",
          businesses: null,
        },
      ],
    });
    renderPage();

    await screen.findByText("Reportes (2)");
    expect(screen.getAllByText("Descartar")).toHaveLength(1);
  });

  it("no muestra la sección de historial cuando está vacío", async () => {
    setupMocks({ business: { ...defaultBusiness, bloqueado: false }, historial: [] });
    renderPage();
    await screen.findByText("Reportes (0)");
    expect(screen.queryByText("Historial de moderación")).not.toBeInTheDocument();
  });

  it("muestra la sección de historial cuando hay registros", async () => {
    setupMocks({
      business: { ...defaultBusiness, bloqueado: false },
      historial: [
        {
          id: "h1",
          id_negocio: "b1",
          id_admin: "a1",
          accion: "desbloqueo",
          motivo: null,
          fecha: "2026-08-01T00:00:00Z",
          email_enviado: false,
          email_enviado_en: null,
        },
      ],
    });
    renderPage();
    expect(await screen.findByText("Historial de moderación")).toBeInTheDocument();
  });
});
