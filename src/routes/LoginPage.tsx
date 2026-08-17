import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Misma cuenta que la app principal de Hermeskopio: un admin es una persona
// normal (fila en `personas`, vía Supabase Auth) cuyo id además aparece en
// `admins`. No hay un sistema de autenticación separado para el panel.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Credenciales incorrectas.");
      setLoading(false);
      return;
    }

    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      setError("Tu cuenta no tiene permiso de administrador.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    navigate("/reportes/negocios", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          Panel de administración — Hermeskopio
        </h1>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Correo
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
