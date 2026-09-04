// Cliente con la service_role key: SOLO se usa server-side (Edge Functions).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente
// en el runtime de cada función, no hace falta configurarlos a mano.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);
