import { createClient } from "@supabase/supabase-js";

// Solo la anon key vive aquí y por lo tanto en el bundle final — es pública
// por diseño (Supabase la protege con RLS del lado del servidor). El
// RESEND_API_KEY nunca aparece en ningún archivo bajo src/: vive únicamente
// dentro del entorno de la Edge Function `send-bloqueo-email`.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — revisa .env.local",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
