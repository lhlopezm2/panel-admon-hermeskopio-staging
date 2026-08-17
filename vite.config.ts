import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base debe coincidir con el nombre del repositorio de GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: "/panel-admon-hermeskopio-staging/",
});
