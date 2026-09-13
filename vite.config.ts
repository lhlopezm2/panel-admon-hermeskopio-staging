import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base debe coincidir con el nombre del repositorio de GitHub Pages del
// ambiente que se esté compilando. Se inyecta vía VITE_BASE_PATH (variable
// de repo en GitHub Actions, ver .github/workflows/deploy.yml) en vez de
// hardcodearlo acá, porque el mismo commit se promueve tal cual (git push)
// al repo de prod, que tiene un nombre de repo distinto.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/panel-admon-hermeskopio-staging/",
});
