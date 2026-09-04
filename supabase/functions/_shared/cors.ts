// CORS abierto: son endpoints públicos de un checkout, sin cookies/sesión de
// por medio (la autorización real es el service_role key, server-side).
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function respuestaCors() {
  return new Response("ok", { headers: corsHeaders });
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
