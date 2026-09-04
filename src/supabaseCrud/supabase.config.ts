import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

export const supabase = createClient<Database>(
  import.meta.env.VITE_APP_SUPABASE_URL,
  import.meta.env.VITE_APP_SUPABASE_ANON_KEY
);
