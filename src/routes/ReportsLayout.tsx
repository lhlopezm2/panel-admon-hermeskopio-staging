import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../supabaseClient";

const TABS = [
  { to: "/reportes/negocios", label: "Negocios Reportados" },
  { to: "/reportes/necesidades", label: "Necesidades Reportadas" },
  { to: "/reportes/problemas", label: "Problemas Reportados" },
];

// Layout compartido por las 3 pestañas del panel — rutas propias (no estado
// de tab en memoria) para que cada una sea refrescable/deep-linkable, igual
// que el resto de pantallas del panel. "Cerrar sesión" vive acá porque
// antes estaba solo en ReportsListPage y ahora aplica a las 3 pestañas.
export default function ReportsLayout() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Panel de administración
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:underline"
        >
          Cerrar sesión
        </button>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
