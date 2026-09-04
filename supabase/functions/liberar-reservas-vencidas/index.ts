// Invocada por cron cada 5-10 minutos (configurar en el Dashboard de
// Supabase, sección Edge Functions > Schedule). Libera piezas reservadas por
// checkouts de ecommerce abandonados hace más de MINUTOS_RESERVA.
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { json, respuestaCors } from "../_shared/cors.ts";
import { MINUTOS_RESERVA } from "../_shared/constantes.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respuestaCors();

  const { data, error } = await supabaseAdmin.rpc(
    "ecommerce_liberar_reservas_vencidas",
    { _minutos: MINUTOS_RESERVA }
  );

  if (error) {
    console.error("Error liberando reservas vencidas:", error.message);
    return json({ ok: false, error: error.message }, 500);
  }

  return json({ ok: true, piezasLiberadas: data });
});
