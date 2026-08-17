import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";

const { supabase, navigateMock } = vi.hoisted(() => ({
  supabase: {
    auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
    rpc: vi.fn(),
  },
  navigateMock: vi.fn(),
}));

vi.mock("../../supabaseClient", () => ({ supabase }));
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

function getInputs(container: HTMLElement) {
  return {
    email: container.querySelector('input[type="email"]') as HTMLInputElement,
    password: container.querySelector('input[type="password"]') as HTMLInputElement,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  it("muestra 'Credenciales incorrectas.' cuando signInWithPassword falla", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: "invalid" } });
    const user = userEvent.setup();
    const { container } = renderPage();
    const { email, password } = getInputs(container);
    await user.type(email, "admin@test.com");
    await user.type(password, "wrong");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Credenciales incorrectas.")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("cierra sesión y muestra error si el login es válido pero is_admin() = false", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.rpc.mockResolvedValue({ data: false, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    const { container } = renderPage();
    const { email, password } = getInputs(container);
    await user.type(email, "user@test.com");
    await user.type(password, "secret");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(
      await screen.findByText("Tu cuenta no tiene permiso de administrador."),
    ).toBeInTheDocument();
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("navega a /reportes cuando el login es válido y is_admin() = true", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.rpc.mockResolvedValue({ data: true, error: null });
    const user = userEvent.setup();
    const { container } = renderPage();
    const { email, password } = getInputs(container);
    await user.type(email, "admin@test.com");
    await user.type(password, "secret");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/reportes", { replace: true }),
    );
  });

  it("deshabilita el botón y muestra 'Ingresando…' mientras se envía", async () => {
    let resolveSignIn!: (value: { error: { message: string } | null }) => void;
    supabase.auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    const user = userEvent.setup();
    const { container } = renderPage();
    const { email, password } = getInputs(container);
    await user.type(email, "admin@test.com");
    await user.type(password, "secret");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
    resolveSignIn({ error: { message: "invalid" } });
    await screen.findByText("Credenciales incorrectas.");
  });

  it("vuelve a habilitar el botón tras un fallo de login", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: "invalid" } });
    const user = userEvent.setup();
    const { container } = renderPage();
    const { email, password } = getInputs(container);
    await user.type(email, "admin@test.com");
    await user.type(password, "wrong");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await screen.findByText("Credenciales incorrectas.");
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  });

  it("vuelve a habilitar el botón tras un login sin permiso de admin", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.rpc.mockResolvedValue({ data: false, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    const { container } = renderPage();
    const { email, password } = getInputs(container);
    await user.type(email, "user@test.com");
    await user.type(password, "secret");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await screen.findByText("Tu cuenta no tiene permiso de administrador.");
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  });
});
