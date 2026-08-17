import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminGuard from "./routes/AdminGuard";
import LoginPage from "./routes/LoginPage";
import ReportsLayout from "./routes/ReportsLayout";
import NegociosReportadosPage from "./routes/NegociosReportadosPage";
import NecesidadesReportadasPage from "./routes/NecesidadesReportadasPage";
import ProblemasReportadosPage from "./routes/ProblemasReportadosPage";
import BusinessDetailPage from "./routes/BusinessDetailPage";

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
