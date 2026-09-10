// Consulta el estado de un pedido por id_orden_externa. No se expone
// `ventas`/`detalle_venta` directo al anon (no tienen RLS): esta función
// curada es el único punto de acceso público a esa información.
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { json, respuestaCors } from "../_shared/cors.ts";
import { CANAL } from "../_shared/constantes.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respuestaCors();

  const url = new URL(req.url);
  let idOrdenExterna = url.searchParams.get("idOrdenExterna");
  if (!idOrdenExterna) {
    try {
      const body = await req.json();
      idOrdenExterna = body?.idOrdenExterna ?? null;
    } catch {
      // sin body: seguimos sin idOrdenExterna, se valida abajo
    }
  }
  if (!idOrdenExterna) return json({ error: "falta idOrdenExterna" }, 400);

  const { data: venta } = await supabaseAdmin
    .from("ventas")
    .select("id, estado, monto_total, nro_comprobante")
    .eq("origen", CANAL)
    .eq("id_orden_externa", idOrdenExterna)
    .maybeSingle();

  if (!venta) return json({ error: "pedido no encontrado" }, 404);

  const { data: detalle } = await supabaseAdmin
    .from("detalle_venta")
    .select("cantidad, precio_venta, total, descripcion, productos(nombre)")
    .eq("id_venta", venta.id);

  const { data: envio } = await supabaseAdmin
    .from("ecommerce_orden_envio")
    .select(
      "destinatario, telefono, cp, estado, municipio, colonia, calle, numero_exterior, numero_interior, entre_calles, referencias, lat, lng"
    )
    .eq("id_orden_externa", idOrdenExterna)
    .maybeSingle();

  return json({
    estado: venta.estado,
    nroComprobante: venta.nro_comprobante,
    montoTotal: venta.monto_total,
    items: (detalle ?? []).map((d) => ({
      // @ts-ignore -- select anidado de supabase-js
      nombre: d.productos?.nombre ?? d.descripcion ?? "Producto",
      cantidad: d.cantidad,
      precioVenta: d.precio_venta,
      total: d.total,
    })),
    envio: envio
      ? {
          destinatario: envio.destinatario,
          telefono: envio.telefono,
          cp: envio.cp,
          estado: envio.estado,
          municipio: envio.municipio,
          colonia: envio.colonia,
          calle: envio.calle,
          numeroExterior: envio.numero_exterior,
          numeroInterior: envio.numero_interior,
          entreCalles: envio.entre_calles,
          referencias: envio.referencias,
          lat: envio.lat,
          lng: envio.lng,
        }
      : null,
  });
});
