import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../supabaseClient";

type GuardStatus = "checking" | "allowed" | "denied";

// Verifica sesión + membresía en `admins` (vía la RPC is_admin(), la misma
// fuente de verdad que consulta la RLS del lado del servidor). Ser un
// usuario válido de Supabase Auth NO alcanza: hace falta estar en la tabla
// `admins`, algo que solo se otorga por SQL/dashboard.
export default function AdminGuard() {
  const [status, setStatus] = useState<GuardStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) setStatus("denied");
        return;
      }
      const { data: isAdmin, error } = await supabase.rpc("is_admin");
      if (!cancelled) {
        setStatus(!error && isAdmin ? "allowed" : "denied");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Verificando permisos…
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
