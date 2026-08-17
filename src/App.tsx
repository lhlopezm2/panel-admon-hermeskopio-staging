import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminGuard from "./routes/AdminGuard";
import LoginPage from "./routes/LoginPage";
import ReportsLayout from "./routes/ReportsLayout";
import NegociosReportadosPage from "./routes/NegociosReportadosPage";
import NecesidadesReportadasPage from "./routes/NecesidadesReportadasPage";
import ProblemasReportadosPage from "./routes/ProblemasReportadosPage";
import BusinessDetailPage from "./routes/BusinessDetailPage";

// HashRouter, no BrowserRouter: GitHub Pages es un servidor de archivos
// estáticos sin rewrites — solo existe un index.html en la raíz del sitio,
// así que CUALQUIER path (/login, /reportes, /negocio/:id) da 404 al
// recargar bajo BrowserRouter. Con HashRouter la ruta vive después del "#"
// (ej. .../#/reportes/negocios), que nunca se manda al servidor: recargar
// siempre pide el index.html de la raíz, que sí existe.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminGuard />}>
          <Route path="/reportes" element={<ReportsLayout />}>
            <Route index element={<Navigate to="negocios" replace />} />
            <Route path="negocios" element={<NegociosReportadosPage />} />
            <Route path="necesidades" element={<NecesidadesReportadasPage />} />
            <Route path="problemas" element={<ProblemasReportadosPage />} />
          </Route>
          <Route path="/negocio/:id" element={<BusinessDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/reportes" replace />} />
      </Routes>
    </HashRouter>
  );
}
