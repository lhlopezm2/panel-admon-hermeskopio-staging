import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Habilitado solo para que el auto-cleanup interno de
    // @testing-library/react (que revisa `globalThis.afterEach`) se
    // registre correctamente; los archivos de test igual importan
    // describe/it/expect/vi explícitamente desde "vitest".
    globals: true,
  },
});
