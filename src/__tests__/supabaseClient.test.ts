import { describe, it, expect, beforeEach, vi } from "vitest";

describe("supabaseClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("lanza un error explicativo si faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    await expect(import("../supabaseClient")).rejects.toThrow(
      /Faltan VITE_SUPABASE_URL/,
    );
  });

  it("crea el cliente cuando ambas variables están presentes", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const mod = await import("../supabaseClient");
    expect(mod.supabase).toBeDefined();
  });
});
