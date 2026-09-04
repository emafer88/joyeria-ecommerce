// Mercado Pago notifica acá cuando cambia el estado de un pago. Nunca se
// confía en el body del webhook por sí solo: siempre se vuelve a consultar
// el pago real contra la API de Mercado Pago antes de actuar.
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { json, respuestaCors } from "../_shared/cors.ts";
import { CANAL, ID_EMPRESA, ID_TIPO_COMPROBANTE, SERIE } from "../_shared/constantes.ts";

async function liberarVentaPendiente(idOrdenExterna: string) {
  const { data: venta } = await supabaseAdmin
    .from("ventas")
    .select("id, estado")
    .eq("origen", CANAL)
    .eq("id_orden_externa", idOrdenExterna)
    .maybeSingle();

  if (!venta || venta.estado !== "pendiente") return;

  const { data: piezas } = await supabaseAdmin
    .from("piezas_inventario")
    .select("id")
    .eq("id_venta_reserva", venta.id)
    .eq("estado", "reservada");

  for (const p of piezas ?? []) {
    await supabaseAdmin.rpc("liberar_pieza", {
      _id_pieza: p.id,
      _id_empresa: ID_EMPRESA,
      _id_usuario: null,
    });
  }

  await supabaseAdmin.from("ventas").update({ estado: "anulada" }).eq("id", venta.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return respuestaCors();

  const url = new URL(req.url);
  let tipo = url.searchParams.get("type") ?? url.searchParams.get("topic");
  let idPago = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (!tipo || !idPago) {
    try {
      const body = await req.json();
      tipo = tipo ?? body?.type ?? body?.topic;
      idPago = idPago ?? body?.data?.id ?? body?.resource;
    } catch {
      // sin body o no es JSON: seguimos con lo que haya en la query
    }
  }

  // Otros tipos de evento (merchant_order, etc.) no nos interesan.
  if (tipo !== "payment" || !idPago) {
    return json({ ok: true, ignorado: true });
  }

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${idPago}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}` },
  });

  if (!mpRes.ok) {
    console.error("No se pudo obtener el pago de Mercado Pago:", await mpRes.text());
    // 200 igual: evita que Mercado Pago reintente en loop por un error
    // nuestro; queda para revisión manual vía logs.
    return json({ ok: false });
  }

  const pago = await mpRes.json();
  const idOrdenExterna: string | undefined = pago.external_reference;
  const estado: string = pago.status;

  if (!idOrdenExterna) {
    console.error("Pago de Mercado Pago sin external_reference:", pago.id);
    return json({ ok: true, ignorado: true });
  }

  if (estado === "approved") {
    const { error } = await supabaseAdmin.rpc("crear_venta_externa_piezas", {
      _canal: CANAL,
      _id_orden_externa: idOrdenExterna,
      _id_tipo_comprobante: ID_TIPO_COMPROBANTE,
      _serie: SERIE,
    });
    if (error) {
      // No se resuelve solo: puede ser que una pieza se haya perdido entre
      // medio. Queda para reconciliación manual (el pago YA fue aprobado).
      console.error(`Error confirmando venta ${idOrdenExterna}:`, error.message);
    }
  } else if (estado === "rejected" || estado === "cancelled") {
    await liberarVentaPendiente(idOrdenExterna);
  }
  // "in_process"/"pending": no hacemos nada, esperamos el próximo webhook.

  return json({ ok: true });
});
