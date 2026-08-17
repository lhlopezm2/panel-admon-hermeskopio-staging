import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminGuard from "./routes/AdminGuard";
import LoginPage from "./routes/LoginPage";
import ReportsListPage from "./routes/ReportsListPage";
import BusinessDetailPage from "./routes/BusinessDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminGuard />}>
          <Route path="/reportes" element={<ReportsListPage />} />
          <Route path="/negocio/:id" element={<BusinessDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/reportes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
